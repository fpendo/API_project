"""
Order matching engine for the exchange.
Implements price-time priority matching by catchment + unit_type.
"""
from sqlalchemy.orm import Session
from typing import List, Tuple
from ..models import Order, Trade, Account, Scheme, AccountRole, BrokerMandate
from .exchange import transfer_credits_on_chain
from .balance_check import check_buyer_has_sufficient_balance
import os
from datetime import datetime

# Hardhat default account #1 (trading account) private key
# This is the standard Hardhat test account private key
# Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
# HARDCODED to prevent ERC1155MissingApprovalForAll errors
HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"


def match_order(new_order: Order, db: Session) -> List[Trade]:
    """
    Match a new order against existing orders using price-time priority.
    
    Matching rules:
    - Orders match only within same catchment + unit_type
    - For BUY orders: match against SELL orders (asks) sorted by price ASC (best ask first)
    - For SELL orders: match against BUY orders (bids) sorted by price DESC (best bid first)
    - Price-time priority: best price first, then earliest order
    - Partial fills are supported
    
    Returns:
        List of Trade objects created from matches
    """
    trades = []
    
    # Find matching orders (opposite side, same catchment + unit_type, pending status)
    opposite_side = "SELL" if new_order.side == "BUY" else "BUY"
    
    matching_orders_query = db.query(Order).filter(
        Order.side == opposite_side,
        Order.catchment == new_order.catchment,
        Order.unit_type == new_order.unit_type,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"]),
        Order.id != new_order.id  # Don't match with itself
    )
    
    # Sort by price-time priority
    # Note: Filter out orders with NULL price_per_unit (shouldn't happen for limit orders, but handle it)
    if new_order.side == "BUY":
        # For BUY orders, match against SELL orders sorted by price ASC (lowest ask first)
        # Only match against limit orders (market orders shouldn't be in order book)
        matching_orders_query = matching_orders_query.filter(
            Order.price_per_unit.isnot(None)
        ).order_by(
            Order.price_per_unit.asc(),
            Order.created_at.asc()
        )
    else:
        # For SELL orders, match against BUY orders sorted by price DESC (highest bid first)
        matching_orders_query = matching_orders_query.filter(
            Order.price_per_unit.isnot(None)
        ).order_by(
            Order.price_per_unit.desc(),
            Order.created_at.asc()
        )
    
    matching_orders = matching_orders_query.all()
    
    print(f"[ORDER_MATCHING] New {new_order.order_type} {new_order.side} order for {new_order.catchment} {new_order.unit_type}, quantity: {new_order.remaining_quantity}")
    print(f"[ORDER_MATCHING] Found {len(matching_orders)} potential matching orders")
    
    remaining_to_fill = new_order.remaining_quantity
    
    for matching_order in matching_orders:
        if remaining_to_fill <= 0:
            break
        
        print(f"[ORDER_MATCHING] Attempting to match with order {matching_order.id}: {matching_order.order_type} {matching_order.side} at £{matching_order.price_per_unit}, remaining: {matching_order.remaining_quantity}")
        
        # Prevent self-trading: don't match orders from the same account
        if new_order.account_id == matching_order.account_id:
            print(f"[ORDER_MATCHING] Skipping self-trade: both orders from account {new_order.account_id}")
            continue
        
        # Check if prices are compatible (only for limit orders)
        if new_order.order_type == "LIMIT" and matching_order.order_type == "LIMIT":
            if new_order.side == "BUY":
                # Buy order can only match if its price >= ask price
                if new_order.price_per_unit < matching_order.price_per_unit:
                    print(f"[ORDER_MATCHING] Price mismatch: buy limit {new_order.price_per_unit} < ask {matching_order.price_per_unit}, stopping")
                    break  # No more matches possible (sorted by price)
            else:
                # Sell order can only match if its price <= bid price
                if new_order.price_per_unit > matching_order.price_per_unit:
                    print(f"[ORDER_MATCHING] Price mismatch: sell limit {new_order.price_per_unit} > bid {matching_order.price_per_unit}, stopping")
                    break  # No more matches possible (sorted by price)
        
        # Determine execution price (use the matching order's price for market orders)
        if new_order.order_type == "MARKET":
            execution_price = matching_order.price_per_unit
            print(f"[ORDER_MATCHING] Market order execution price: £{execution_price} (from matching limit order)")
        elif matching_order.order_type == "MARKET":
            execution_price = new_order.price_per_unit
            print(f"[ORDER_MATCHING] Market order execution price: £{execution_price} (from new limit order)")
        else:
            # Both are limit orders - use the matching order's price (price-time priority)
            execution_price = matching_order.price_per_unit
            print(f"[ORDER_MATCHING] Limit order execution price: £{execution_price}")
        
        # Calculate fill quantity
        available_from_match = matching_order.remaining_quantity
        fill_quantity = min(remaining_to_fill, available_from_match)
        
        # Get accounts for on-chain transfer
        if new_order.side == "BUY":
            buyer = db.query(Account).filter(Account.id == new_order.account_id).first()
            seller = db.query(Account).filter(Account.id == matching_order.account_id).first()
        else:
            buyer = db.query(Account).filter(Account.id == matching_order.account_id).first()
            seller = db.query(Account).filter(Account.id == new_order.account_id).first()
        
        if not buyer or not seller:
            print(f"[ORDER_MATCHING] ERROR: Buyer or seller account not found. Buyer ID: {new_order.account_id if new_order.side == 'BUY' else matching_order.account_id}, Seller ID: {matching_order.account_id if new_order.side == 'BUY' else new_order.account_id}")
            continue  # Skip if accounts are invalid
        
        if not buyer.evm_address or not seller.evm_address:
            print(f"[ORDER_MATCHING] ERROR: Buyer or seller missing EVM address. Buyer: {buyer.evm_address}, Seller: {seller.evm_address}")
            continue  # Skip if accounts are invalid
        
        # Get scheme for on-chain transfer (use the seller's scheme)
        # For catchment-based matching, we need to find a scheme from the seller
        # that matches the catchment + unit_type
        scheme = None
        
        # First, try to use the scheme_id from the matching order (if it's a sell order)
        if matching_order.scheme_id:
            scheme = db.query(Scheme).filter(Scheme.id == matching_order.scheme_id).first()
            if scheme:
                print(f"[ORDER_MATCHING] Using scheme {scheme.id} from matching order (scheme_id: {matching_order.scheme_id})")
        
        if not scheme:
            # Find any scheme with matching catchment + unit_type from seller
            # First try to find a scheme owned by the seller
            print(f"[ORDER_MATCHING] Scheme not found from matching order, searching for scheme owned by seller {seller.id}")
            seller_schemes = db.query(Scheme).filter(
                Scheme.catchment == new_order.catchment,
                Scheme.unit_type == new_order.unit_type,
                Scheme.created_by_account_id == seller.id
            ).first()
            if seller_schemes:
                scheme = seller_schemes
                print(f"[ORDER_MATCHING] Found seller's scheme: {scheme.id}")
            else:
                # Fallback: any scheme with matching catchment + unit_type
                print(f"[ORDER_MATCHING] Seller's scheme not found, searching for any scheme with {new_order.catchment} {new_order.unit_type}")
                scheme = db.query(Scheme).filter(
                    Scheme.catchment == new_order.catchment,
                    Scheme.unit_type == new_order.unit_type
                ).first()
                if scheme:
                    print(f"[ORDER_MATCHING] Found fallback scheme: {scheme.id}")
        
        if not scheme:
            print(f"[ORDER_MATCHING] ERROR: No scheme found for {new_order.catchment} {new_order.unit_type}. Matching order scheme_id: {matching_order.scheme_id}, Seller ID: {seller.id}")
            # List all schemes in database for debugging
            all_schemes = db.query(Scheme).all()
            print(f"[ORDER_MATCHING] Available schemes in DB: {[(s.id, s.catchment, s.unit_type, s.created_by_account_id) for s in all_schemes]}")
            continue  # Skip if no scheme found
        
        print(f"[ORDER_MATCHING] Using scheme {scheme.id} (nft_token_id: {scheme.nft_token_id}) for transfer")
        
        # Check buyer balance before creating trade (for BUY orders)
        if new_order.side == "BUY":
            trade_cost = fill_quantity * execution_price
            has_sufficient, available_balance = check_buyer_has_sufficient_balance(
                buyer=buyer,
                required_amount_gbp=trade_cost,
                db=db
            )
            
            if not has_sufficient:
                print(f"[ORDER_MATCHING] Buyer {buyer.id} has insufficient balance. Available: £{available_balance:,.2f}, Required: £{trade_cost:,.2f}. Skipping this match.")
                # Stop matching if buyer can't afford this trade
                break
        
        # For landowners selling credits, ALWAYS use trading account address
        # Landowners transfer credits they want to trade into the trading account
        # All trades must be settled from the trading account
        trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        
        # Determine the actual seller address to use for transfer
        actual_seller_address = seller.evm_address
        seller_private_key = None
        
        if seller.role == AccountRole.LANDOWNER:
            actual_seller_address = trading_account_address
            print(f"[ORDER_MATCHING] Seller is a landowner, using trading account address: {actual_seller_address}")
        elif seller.role == AccountRole.BROKER:
            # Broker credits can be in two places:
            # 1. Client credits (95%) -> broker.evm_address
            # 2. House credits (5%) -> BROKER_HOUSE_ADDRESS
            # Check if this is a bot order (sell ladder or market-making) to determine which address to use
            from ..models import SellLadderBotOrder, SellLadderFIFOCreditQueue, SellLadderBotAssignment, BotOrder, FIFOCreditQueue, BotAssignment
            
            # Check for sell ladder bot order first
            sell_ladder_order = db.query(SellLadderBotOrder).filter(SellLadderBotOrder.order_id == matching_order.id).first()
            is_house_account = None
            
            if sell_ladder_order and sell_ladder_order.fifo_queue_id:
                # Get the FIFO queue entry to check if it's house or client
                fifo_queue = db.query(SellLadderFIFOCreditQueue).filter(
                    SellLadderFIFOCreditQueue.id == sell_ladder_order.fifo_queue_id
                ).first()
                
                if fifo_queue and fifo_queue.assignment_id:
                    assignment = db.query(SellLadderBotAssignment).filter(
                        SellLadderBotAssignment.id == fifo_queue.assignment_id
                    ).first()
                    
                    if assignment:
                        is_house_account = assignment.is_house_account == 1
            
            # Check for market-making bot order if not a sell ladder bot order
            if is_house_account is None:
                bot_order = db.query(BotOrder).filter(BotOrder.order_id == matching_order.id).first()
                
                if bot_order:
                    # Find the FIFO queue entry for this scheme
                    fifo_queue = db.query(FIFOCreditQueue).filter(
                        FIFOCreditQueue.bot_id == bot_order.bot_id,
                        FIFOCreditQueue.scheme_id == scheme.id,
                        FIFOCreditQueue.credits_available > 0
                    ).order_by(
                        FIFOCreditQueue.queue_position.asc(),
                        FIFOCreditQueue.id.asc()
                    ).first()
                    
                    if fifo_queue and fifo_queue.assignment_id:
                        assignment = db.query(BotAssignment).filter(
                            BotAssignment.id == fifo_queue.assignment_id
                        ).first()
                        
                        if assignment:
                            is_house_account = assignment.is_house_account == 1
            
            # Use the appropriate address based on whether it's house or client
            if is_house_account == 1:
                # House account credits -> use house address
                house_address = os.getenv("BROKER_HOUSE_ADDRESS")
                if house_address:
                    actual_seller_address = house_address
                    print(f"[ORDER_MATCHING] Seller is broker (house account), using house address: {actual_seller_address}")
                else:
                    print(f"[ORDER_MATCHING] WARNING: BROKER_HOUSE_ADDRESS not set, using broker address")
            elif is_house_account == 0:
                # Client account credits -> use broker address
                print(f"[ORDER_MATCHING] Seller is broker (client account), using broker address: {actual_seller_address}")
            else:
                # Could not determine - assume broker address
                print(f"[ORDER_MATCHING] Seller is broker (could not determine house/client), using broker address: {actual_seller_address}")
        
        # Execute on-chain transfer
        tx_hash = None
        try:
            scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
            rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
            
            # Determine which private key to use based on the seller address
            # CRITICAL: The private key MUST match the seller address to avoid ERC1155MissingApprovalForAll errors
            if not seller_private_key:  # Only set if not already determined above
                if actual_seller_address.lower() == trading_account_address.lower():
                    # Transferring FROM trading account - need trading account's private key
                    seller_private_key = os.getenv("TRADING_ACCOUNT_PRIVATE_KEY")
                    if not seller_private_key:
                        # Fallback: Hardhat account #1 private key (default trading account)
                        # This is hardcoded to prevent future issues
                        seller_private_key = HARDHAT_TRADING_ACCOUNT_PRIVATE_KEY
                        print(f"[ORDER_MATCHING] Using hardcoded Hardhat account #1 key for trading account")
                    else:
                        print(f"[ORDER_MATCHING] Using TRADING_ACCOUNT_PRIVATE_KEY from environment")
                elif seller.role == AccountRole.BROKER:
                    # Broker account - check if it's house or client
                    house_address = os.getenv("BROKER_HOUSE_ADDRESS", "")
                    if actual_seller_address.lower() == house_address.lower():
                        # House account - use house address's private key directly
                        # Hardhat account #9 private key (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720)
                        # This is the standard Hardhat test account #9 private key
                        HARDHAT_ACCOUNT_9_PRIVATE_KEY = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
                        seller_private_key = os.getenv("BROKER_HOUSE_PRIVATE_KEY") or HARDHAT_ACCOUNT_9_PRIVATE_KEY
                        print(f"[ORDER_MATCHING] Using house address private key for house account: {actual_seller_address}")
                    else:
                        # Client account - use broker private key
                        seller_private_key = os.getenv("BROKER_PRIVATE_KEY")
                        if not seller_private_key:
                            seller_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
                        print(f"[ORDER_MATCHING] Using BROKER/REGULATOR private key for broker client account: {actual_seller_address}")
                else:
                    # Transferring FROM landowner/regulator - use their private key
                    seller_private_key = os.getenv("LANDOWNER_PRIVATE_KEY")
                    if not seller_private_key:
                        seller_private_key = os.getenv("REGULATOR_PRIVATE_KEY")
                    print(f"[ORDER_MATCHING] Using LANDOWNER/REGULATOR private key for seller: {actual_seller_address}")
            
            if scheme_credits_address and seller_private_key:
                print(f"[ORDER_MATCHING] Executing on-chain transfer: {fill_quantity} credits from {actual_seller_address} to {buyer.evm_address}")
                tx_hash = transfer_credits_on_chain(
                    seller_address=actual_seller_address,
                    buyer_address=buyer.evm_address,
                    scheme_id=scheme.nft_token_id,
                    quantity_credits=fill_quantity,
                    seller_private_key=seller_private_key,
                    scheme_credits_address=scheme_credits_address,
                    rpc_url=rpc_url
                )
                print(f"[ORDER_MATCHING] On-chain transfer successful, tx_hash: {tx_hash}")
            else:
                print(f"[ORDER_MATCHING] WARNING: Skipping on-chain transfer (scheme_credits_address: {scheme_credits_address}, seller_private_key: {'set' if seller_private_key else 'not set'})")
                tx_hash = None  # Skip on-chain if not configured
        except Exception as e:
            print(f"[ORDER_MATCHING] ERROR executing on-chain transfer: {str(e)}")
            import traceback
            traceback.print_exc()
            tx_hash = None  # Continue with trade record even if on-chain fails
        
        # Look up mandate_id if seller is a broker (for client funds tracking)
        mandate_id = None
        if seller.role == AccountRole.BROKER:
            # Find the client mandate for this broker + scheme
            mandate = db.query(BrokerMandate).filter(
                BrokerMandate.broker_account_id == seller.id,
                BrokerMandate.scheme_id == scheme.id,
                BrokerMandate.is_recalled == 0
            ).order_by(BrokerMandate.created_at.desc()).first()
            
            if mandate:
                mandate_id = mandate.id
                print(f"[ORDER_MATCHING] Broker sale linked to mandate #{mandate_id} (landowner: {mandate.landowner_account_id})")
            else:
                print(f"[ORDER_MATCHING] Broker sale - no client mandate found (house account sale)")
        
        # Create trade record
        trade = Trade(
            listing_id=None,  # Not using listings anymore
            buyer_account_id=buyer.id,
            seller_account_id=seller.id,
            scheme_id=scheme.id,
            quantity_units=fill_quantity,
            price_per_unit=execution_price,
            total_price=fill_quantity * execution_price,
            transaction_hash=tx_hash,
            mandate_id=mandate_id
        )
        db.add(trade)
        trades.append(trade)
        print(f"[ORDER_MATCHING] Created trade {trade.id}: {fill_quantity} credits at £{execution_price} = £{fill_quantity * execution_price}")
        
        # Update FIFO queue if this is a bot order being filled
        # Check if the seller order is a bot order (market-making or sell ladder)
        from ..models import BotOrder, SellLadderBotOrder
        from ..services.market_making_bot import update_queue_after_trade
        from ..services.sell_ladder_bot import (
            update_queue_after_trade as update_sell_ladder_queue_after_trade,
            get_sell_ladder_bot_order_by_order_id,
            replenish_filled_level
        )
        
        bot_order_seller = db.query(BotOrder).filter(BotOrder.order_id == matching_order.id).first()
        if bot_order_seller and matching_order.side == "SELL":
            # This is a bot sell order being filled - update FIFO queue
            from ..services.market_making_bot import update_queue_after_trade, get_bot_order_by_order_id
            from ..services.sell_ladder_bot import (
                update_queue_after_trade as update_sell_ladder_queue_after_trade,
                get_sell_ladder_bot_order_by_order_id,
                replenish_filled_level
            )
            # Find the queue entry for this scheme (FIFO - first available)
            from ..models import FIFOCreditQueue
            queue_entry = db.query(FIFOCreditQueue).filter(
                FIFOCreditQueue.bot_id == bot_order_seller.bot_id,
                FIFOCreditQueue.scheme_id == scheme.id,
                FIFOCreditQueue.credits_available > 0
            ).order_by(
                FIFOCreditQueue.queue_position.asc(),
                FIFOCreditQueue.id.asc()
            ).first()
            if queue_entry:
                # Update the queue entry that has credits
                credits_to_deduct = min(fill_quantity, queue_entry.credits_available)
                update_queue_after_trade(queue_entry.id, credits_to_deduct, db)
                print(f"[ORDER_MATCHING] Updated FIFO queue {queue_entry.id} after bot trade: -{credits_to_deduct} credits (available: {queue_entry.credits_available - credits_to_deduct})")
                
                # If we need to deduct more credits, move to next queue entry
                remaining_to_deduct = fill_quantity - credits_to_deduct
                if remaining_to_deduct > 0:
                    next_queue = db.query(FIFOCreditQueue).filter(
                        FIFOCreditQueue.bot_id == bot_order_seller.bot_id,
                        FIFOCreditQueue.scheme_id == scheme.id,
                        FIFOCreditQueue.credits_available > 0,
                        FIFOCreditQueue.id != queue_entry.id
                    ).order_by(
                        FIFOCreditQueue.queue_position.asc(),
                        FIFOCreditQueue.id.asc()
                    ).first()
                    if next_queue:
                        credits_to_deduct_2 = min(remaining_to_deduct, next_queue.credits_available)
                        update_queue_after_trade(next_queue.id, credits_to_deduct_2, db)
                        print(f"[ORDER_MATCHING] Updated FIFO queue {next_queue.id} after bot trade: -{credits_to_deduct_2} credits")
            else:
                print(f"[ORDER_MATCHING] WARNING: No FIFO queue entry found for bot {bot_order_seller.bot_id}, scheme {scheme.id}")
        
        # Check for sell ladder bot order
        sell_ladder_order = db.query(SellLadderBotOrder).filter(SellLadderBotOrder.order_id == matching_order.id).first()
        if sell_ladder_order and matching_order.side == "SELL":
            # This is a sell ladder bot order being filled
            if sell_ladder_order.fifo_queue_id:
                update_sell_ladder_queue_after_trade(sell_ladder_order.fifo_queue_id, fill_quantity, db)
                print(f"[ORDER_MATCHING] Updated sell ladder FIFO queue {sell_ladder_order.fifo_queue_id} after trade: -{fill_quantity} credits")
            
            # Replenish the filled level if order is fully filled
            if matching_order.remaining_quantity == 0:
                replenish_filled_level(sell_ladder_order.bot_id, sell_ladder_order.price_level, db)
                print(f"[ORDER_MATCHING] Replenished sell ladder bot {sell_ladder_order.bot_id} level {sell_ladder_order.price_level}")
        
        # Also check if the buyer order is a bot order (for buy orders)
        bot_order_buyer = db.query(BotOrder).filter(BotOrder.order_id == new_order.id).first()
        if bot_order_buyer and new_order.side == "BUY":
            # Bot bought credits - we don't update FIFO queue for buys, but we could track inventory
            print(f"[ORDER_MATCHING] Bot {bot_order_buyer.bot_id} bought {fill_quantity} credits")
        
        # Update order quantities
        new_order.filled_quantity += fill_quantity
        new_order.remaining_quantity -= fill_quantity
        
        matching_order.filled_quantity += fill_quantity
        matching_order.remaining_quantity -= fill_quantity
        
        # Update order statuses
        if new_order.remaining_quantity == 0:
            new_order.status = "FILLED"
        elif new_order.filled_quantity > 0:
            new_order.status = "PARTIALLY_FILLED"
        
        if matching_order.remaining_quantity == 0:
            matching_order.status = "FILLED"
        elif matching_order.filled_quantity > 0:
            matching_order.status = "PARTIALLY_FILLED"
        
        remaining_to_fill = new_order.remaining_quantity
        
        # Commit after each match to ensure consistency
        try:
            db.commit()
            db.refresh(new_order)
            db.refresh(matching_order)
        except Exception as e:
            print(f"[ORDER_MATCHING] ERROR committing trade: {str(e)}")
            db.rollback()
            # Remove the trade from the list since it failed to commit
            trades.pop()
            raise
    
    return trades

