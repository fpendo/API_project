from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from ..db import SessionLocal
from ..models import ExchangeListing, Account, Scheme, Trade, Order, PriceHistory, AccountRole
from ..services.exchange import check_seller_has_sufficient_credits, transfer_credits_on_chain
from ..services.order_matching import match_order
from ..services.price_history import update_price_history, get_price_history
from ..services.balance_check import check_buyer_has_sufficient_balance
import os

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateListingRequest(BaseModel):
    owner_account_id: int
    scheme_id: int
    price_per_unit: float
    quantity_units: int  # In credits


class ListingResponse(BaseModel):
    id: int
    owner_account_id: int
    scheme_id: int
    catchment: str
    unit_type: str
    price_per_unit: float
    quantity_units: int
    reserved_units: int
    status: str
    created_at: str

    model_config = {"from_attributes": True}


class BuyListingRequest(BaseModel):
    buyer_account_id: int
    quantity_units: int  # In credits


class TradeResponse(BaseModel):
    id: int
    listing_id: Optional[int]
    buyer_account_id: int
    seller_account_id: int
    scheme_id: int
    quantity_units: int
    price_per_unit: float
    total_price: float
    transaction_hash: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


# New order models
class CreateLimitOrderRequest(BaseModel):
    account_id: int
    side: str  # "BUY" or "SELL"
    catchment: str
    unit_type: str  # "nitrate" or "phosphate"
    price_per_unit: float
    quantity_units: int


class CreateMarketOrderRequest(BaseModel):
    account_id: int
    side: str  # "BUY" or "SELL"
    catchment: str
    unit_type: str  # "nitrate" or "phosphate"
    quantity_units: int


class OrderResponse(BaseModel):
    id: int
    account_id: int
    order_type: str
    side: str
    catchment: str
    unit_type: str
    price_per_unit: Optional[float]
    quantity_units: int
    filled_quantity: int
    remaining_quantity: int
    status: str
    scheme_id: Optional[int]
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class MultipleOrdersResponse(BaseModel):
    """Response for orders that were split across multiple schemes"""
    orders: List[OrderResponse]
    total_quantity: int
    message: str


class OrderBookEntry(BaseModel):
    price: float
    quantity: int
    total: float


class OrderBookResponse(BaseModel):
    bids: List[OrderBookEntry]
    asks: List[OrderBookEntry]


class CandlestickData(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


@router.post("/listings", response_model=ListingResponse)
def create_listing(request: CreateListingRequest, db: Session = Depends(get_db)):
    """
    Create a new listing for credits.
    Confirms seller has sufficient free credits (on-chain balance minus locked and reserved).
    """
    # Get owner account
    owner = db.query(Account).filter(Account.id == request.owner_account_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner account not found")
    
    if not owner.evm_address:
        raise HTTPException(status_code=400, detail="Owner account does not have an EVM address")
    
    # Get scheme
    scheme = db.query(Scheme).filter(Scheme.id == request.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Validate quantity
    if request.quantity_units <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    
    if request.price_per_unit <= 0:
        raise HTTPException(status_code=400, detail="Price per unit must be greater than 0")
    
    # Check seller has sufficient free credits.
    # Use both DB scheme.id (for listings) and ERC-1155 tokenId (for on-chain balance).
    has_sufficient, available = check_seller_has_sufficient_credits(
        seller=owner,
        db_scheme_id=scheme.id,
        scheme_nft_token_id=scheme.nft_token_id,
        required_credits=request.quantity_units,
        db=db
    )
    
    if not has_sufficient:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient free credits. Available: {available}, Required: {request.quantity_units}"
        )
    
    # Create listing
    listing = ExchangeListing(
        owner_account_id=request.owner_account_id,
        scheme_id=request.scheme_id,         # DB scheme.id
        nft_token_id=scheme.nft_token_id,    # ERC-1155 tokenId
        catchment=scheme.catchment,
        unit_type=scheme.unit_type,
        price_per_unit=request.price_per_unit,
        quantity_units=request.quantity_units,
        reserved_units=0,
        status="ACTIVE"
    )
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    return ListingResponse(
        id=listing.id,
        owner_account_id=listing.owner_account_id,
        scheme_id=listing.scheme_id,
        catchment=listing.catchment,
        unit_type=listing.unit_type,
        price_per_unit=listing.price_per_unit,
        quantity_units=listing.quantity_units,
        reserved_units=listing.reserved_units,
        status=listing.status,
        created_at=listing.created_at.isoformat() if listing.created_at else ""
    )


@router.get("/listings", response_model=List[ListingResponse])
def browse_listings(
    catchment: Optional[str] = Query(None, description="Filter by catchment"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type (nitrate/phosphate)"),
    db: Session = Depends(get_db)
):
    """
    Browse active listings, optionally filtered by catchment and unit type.
    """
    query = db.query(ExchangeListing).filter(ExchangeListing.status == "ACTIVE")
    
    if catchment:
        query = query.filter(ExchangeListing.catchment == catchment.upper())
    
    if unit_type:
        query = query.filter(ExchangeListing.unit_type == unit_type.lower())
    
    listings = query.order_by(ExchangeListing.created_at.desc()).all()
    
    return [
        ListingResponse(
            id=listing.id,
            owner_account_id=listing.owner_account_id,
            scheme_id=listing.scheme_id,
            catchment=listing.catchment,
            unit_type=listing.unit_type,
            price_per_unit=listing.price_per_unit,
            quantity_units=listing.quantity_units,
            reserved_units=listing.reserved_units,
            status=listing.status,
            created_at=listing.created_at.isoformat() if listing.created_at else ""
        )
        for listing in listings
    ]


@router.post("/listings/{listing_id}/buy", response_model=TradeResponse)
def buy_listing(
    listing_id: int = Path(..., description="ID of the listing to buy"),
    request: BuyListingRequest = ...,
    db: Session = Depends(get_db)
):
    """
    Execute purchase of credits from a listing.
    Transfers credits on-chain and records the trade.
    """
    # Get listing
    listing = db.query(ExchangeListing).filter(ExchangeListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.status != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Listing is not active (status: {listing.status})")
    
    # Validate quantity
    available_quantity = listing.quantity_units - listing.reserved_units
    if request.quantity_units > available_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Requested quantity ({request.quantity_units}) exceeds available ({available_quantity})"
        )
    
    if request.quantity_units <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    
    # Get buyer account
    buyer = db.query(Account).filter(Account.id == request.buyer_account_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer account not found")
    
    if not buyer.evm_address:
        raise HTTPException(status_code=400, detail="Buyer account does not have an EVM address")
    
    # Get seller account
    seller = db.query(Account).filter(Account.id == listing.owner_account_id).first()
    if not seller or not seller.evm_address:
        raise HTTPException(status_code=400, detail="Seller account not found or has no EVM address")
    
    # Get scheme
    scheme = db.query(Scheme).filter(Scheme.id == listing.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Get contract configuration
    scheme_credits_address = os.getenv("SCHEME_CREDITS_CONTRACT_ADDRESS")
    seller_private_key = os.getenv("SELLER_PRIVATE_KEY")  # In production, this would be stored securely per account
    rpc_url = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    
    if not scheme_credits_address or not seller_private_key:
        raise HTTPException(
            status_code=500,
            detail="Blockchain configuration missing. SCHEME_CREDITS_CONTRACT_ADDRESS and SELLER_PRIVATE_KEY must be set."
        )
    
    # Transfer credits on-chain
    try:
        tx_hash = transfer_credits_on_chain(
            seller_address=seller.evm_address,
            buyer_address=buyer.evm_address,
            scheme_id=scheme.nft_token_id,
            quantity_credits=request.quantity_units,
            seller_private_key=seller_private_key,
            scheme_credits_address=scheme_credits_address,
            rpc_url=rpc_url
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transfer credits on-chain: {str(e)}")
    
    # Calculate total price
    total_price = request.quantity_units * listing.price_per_unit
    
    # Update listing
    listing.quantity_units -= request.quantity_units
    if listing.quantity_units == 0:
        listing.status = "SOLD"
    
    # Record trade
    trade = Trade(
        listing_id=listing.id,
        buyer_account_id=request.buyer_account_id,
        seller_account_id=listing.owner_account_id,
        scheme_id=listing.scheme_id,
        quantity_units=request.quantity_units,
        price_per_unit=listing.price_per_unit,
        total_price=total_price,
        transaction_hash=tx_hash
    )
    
    db.add(trade)
    db.commit()
    db.refresh(trade)
    
    return TradeResponse(
        id=trade.id,
        listing_id=trade.listing_id,
        buyer_account_id=trade.buyer_account_id,
        seller_account_id=trade.seller_account_id,
        scheme_id=trade.scheme_id,
        quantity_units=trade.quantity_units,
        price_per_unit=trade.price_per_unit,
        total_price=trade.total_price,
        transaction_hash=trade.transaction_hash,
        created_at=trade.created_at.isoformat() if trade.created_at else ""
    )


# New order endpoints
@router.post("/orders/limit", response_model=OrderResponse)
def create_limit_order(request: CreateLimitOrderRequest, db: Session = Depends(get_db)):
    """
    Create a limit order (buy or sell).
    Orders are matched immediately if possible, otherwise placed in the order book.
    """
    # Validate inputs
    if request.side not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Side must be BUY or SELL")
    
    if request.unit_type not in ["nitrate", "phosphate"]:
        raise HTTPException(status_code=400, detail="Unit type must be nitrate or phosphate")
    
    if request.quantity_units <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    
    if request.price_per_unit <= 0:
        raise HTTPException(status_code=400, detail="Price per unit must be greater than 0")
    
    # Get account
    account = db.query(Account).filter(Account.id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not account.evm_address:
        raise HTTPException(status_code=400, detail="Account does not have an EVM address")
    
    # For BUY orders, validate available balance
    if request.side == "BUY":
        # Calculate maximum cost (quantity * price)
        max_cost = request.quantity_units * request.price_per_unit
        
        has_sufficient, available_balance = check_buyer_has_sufficient_balance(
            buyer=account,
            required_amount_gbp=max_cost,
            db=db
        )
        
        if not has_sufficient:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Available: £{available_balance:,.2f}, Required: £{max_cost:,.2f}"
            )
    
    # For SELL orders, validate available credits in the specified catchment
    scheme = None
    if request.side == "SELL":
        # Get seller's actual holdings to check if they have credits in the requested catchment
        from ..services.credits_summary import get_account_credits_summary
        
        # For landowners, pass trading_account_address so it checks trading account balances
        trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
        holdings = get_account_credits_summary(
            account, 
            db,
            trading_account_address=trading_account_address if account.role == AccountRole.LANDOWNER else None
        )
        
        # Filter holdings by the requested catchment and unit_type
        matching_holdings = [
            h for h in holdings
            if h["catchment"] == request.catchment.upper()
            and h["unit_type"] == request.unit_type.lower()
        ]
        
        if not matching_holdings:
            raise HTTPException(
                status_code=400,
                detail=f"No credits found in {request.catchment} catchment for {request.unit_type}. "
                       f"You can only sell credits you own in the specified catchment."
            )
        
        # Calculate total available credits across all schemes in this catchment/unit_type
        # For landowners, credits are in the trading account, so use trading_account_credits
        # For others, use the regular credits balance
        total_available_credits = 0
        for h in matching_holdings:
            if account.role == AccountRole.LANDOWNER:
                # Landowners sell from trading account
                trading_credits = h.get("trading_account_credits", 0)
                locked = h.get("locked_credits", 0)
                # Locked credits are on the trading account, so subtract from trading account balance
                total_available_credits += max(0, trading_credits - locked)
            else:
                # Others sell from their personal balance
                total_available_credits += max(0, h["credits"] - h.get("locked_credits", 0))
        
        # Check existing reservations (listings and orders) in this catchment/unit_type
        existing_listings = db.query(ExchangeListing).filter(
            ExchangeListing.owner_account_id == account.id,
            ExchangeListing.catchment == request.catchment.upper(),
            ExchangeListing.unit_type == request.unit_type.lower(),
            ExchangeListing.status == "ACTIVE"
        ).all()
        
        existing_orders = db.query(Order).filter(
            Order.account_id == account.id,
            Order.side == "SELL",
            Order.catchment == request.catchment.upper(),
            Order.unit_type == request.unit_type.lower(),
            Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
        ).all()
        
        reserved_credits = sum(listing.quantity_units for listing in existing_listings)
        reserved_credits += sum(order.remaining_quantity for order in existing_orders)
        
        # Free credits = total available minus already reserved
        free_credits = total_available_credits - reserved_credits
        if free_credits < 0:
            free_credits = 0
        
        if free_credits < request.quantity_units:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient free credits in {request.catchment} catchment for {request.unit_type}. "
                       f"Available: {free_credits:,} credits, Required: {request.quantity_units:,} credits. "
                       f"(Total available: {total_available_credits:,}, Already reserved: {reserved_credits:,})"
            )
        
        # For SELL orders, create separate orders for each scheme with available credits
        if request.side == "SELL":
            # Calculate available credits per scheme (after reservations)
            scheme_allocations = []
            remaining_to_allocate = request.quantity_units
            
            for holding in matching_holdings:
                if remaining_to_allocate <= 0:
                    break
                
                scheme_id = holding["scheme_id"]
                scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
                if not scheme:
                    continue
                
                # Calculate available credits for this scheme
                if account.role == AccountRole.LANDOWNER:
                    scheme_available = max(0, holding.get("trading_account_credits", 0) - holding.get("locked_credits", 0))
                else:
                    scheme_available = max(0, holding["credits"] - holding.get("locked_credits", 0))
                
                # Subtract already reserved credits for this scheme
                scheme_listings = db.query(ExchangeListing).filter(
                    ExchangeListing.owner_account_id == account.id,
                    ExchangeListing.scheme_id == scheme_id,
                    ExchangeListing.status == "ACTIVE"
                ).all()
                scheme_orders = db.query(Order).filter(
                    Order.account_id == account.id,
                    Order.side == "SELL",
                    Order.scheme_id == scheme_id,
                    Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
                ).all()
                
                scheme_reserved = sum(l.quantity_units for l in scheme_listings)
                scheme_reserved += sum(o.remaining_quantity for o in scheme_orders)
                scheme_free = max(0, scheme_available - scheme_reserved)
                
                if scheme_free > 0:
                    # Allocate credits from this scheme
                    allocate_from_scheme = min(scheme_free, remaining_to_allocate)
                    scheme_allocations.append({
                        "scheme": scheme,
                        "quantity": allocate_from_scheme,
                        "available": scheme_free
                    })
                    remaining_to_allocate -= allocate_from_scheme
            
            if remaining_to_allocate > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not allocate all credits across available schemes. "
                           f"Remaining: {remaining_to_allocate:,} credits. "
                           f"Created {len(scheme_allocations)} order(s) for {request.quantity_units - remaining_to_allocate:,} credits."
                )
            
            # Create separate orders for each scheme
            created_orders = []
            all_trades = []
            
            for allocation in scheme_allocations:
                order = Order(
                    account_id=request.account_id,
                    order_type="LIMIT",
                    side=request.side,
                    catchment=request.catchment.upper(),
                    unit_type=request.unit_type.lower(),
                    price_per_unit=request.price_per_unit,
                    quantity_units=allocation["quantity"],
                    filled_quantity=0,
                    remaining_quantity=allocation["quantity"],
                    status="PENDING",
                    scheme_id=allocation["scheme"].id,
                    nft_token_id=allocation["scheme"].nft_token_id
                )
                
                db.add(order)
                db.flush()  # Flush to get order ID
                
                # Attempt to match the order
                try:
                    trades = match_order(order, db)
                    all_trades.extend(trades)
                    
                    # Update price history for each trade
                    for trade in trades:
                        update_price_history(trade, db)
                    
                    db.refresh(order)
                except Exception as e:
                    print(f"Error matching order {order.id}: {str(e)}")
                
                created_orders.append(order)
            
            db.commit()
            
            # If multiple orders were created, return a list
            if len(created_orders) > 1:
                from fastapi import Response
                return MultipleOrdersResponse(
                    orders=[
                        OrderResponse(
                            id=o.id,
                            account_id=o.account_id,
                            order_type=o.order_type,
                            side=o.side,
                            catchment=o.catchment,
                            unit_type=o.unit_type,
                            price_per_unit=o.price_per_unit,
                            quantity_units=o.quantity_units,
                            filled_quantity=o.filled_quantity,
                            remaining_quantity=o.remaining_quantity,
                            status=o.status,
                            scheme_id=o.scheme_id,
                            created_at=o.created_at.isoformat() if o.created_at else "",
                            updated_at=o.updated_at.isoformat() if o.updated_at else ""
                        )
                        for o in created_orders
                    ],
                    total_quantity=sum(o.quantity_units for o in created_orders),
                    message=f"Created {len(created_orders)} separate orders across {len(scheme_allocations)} schemes"
                )
            else:
                # Single order, return normal response
                order = created_orders[0]
                return OrderResponse(
                    id=order.id,
                    account_id=order.account_id,
                    order_type=order.order_type,
                    side=order.side,
                    catchment=order.catchment,
                    unit_type=order.unit_type,
                    price_per_unit=order.price_per_unit,
                    quantity_units=order.quantity_units,
                    filled_quantity=order.filled_quantity,
                    remaining_quantity=order.remaining_quantity,
                    status=order.status,
                    scheme_id=order.scheme_id,
                    created_at=order.created_at.isoformat() if order.created_at else "",
                    updated_at=order.updated_at.isoformat() if order.updated_at else ""
                )
        
        # For BUY orders, find a scheme (optional, for tracking)
        scheme = None
        if request.side == "BUY":
            # Try to find a scheme in the catchment/unit_type (optional for buy orders)
            scheme = db.query(Scheme).filter(
                Scheme.catchment == request.catchment.upper(),
                Scheme.unit_type == request.unit_type.lower()
            ).first()
    
    # Create order (for BUY orders)
    order = Order(
        account_id=request.account_id,
        order_type="LIMIT",
        side=request.side,
        catchment=request.catchment.upper(),
        unit_type=request.unit_type.lower(),
        price_per_unit=request.price_per_unit,
        quantity_units=request.quantity_units,
        filled_quantity=0,
        remaining_quantity=request.quantity_units,
        status="PENDING",
        scheme_id=scheme.id if scheme else None,
        nft_token_id=scheme.nft_token_id if scheme else None
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Attempt to match the order
    try:
        trades = match_order(order, db)
        
        # Update price history for each trade
        for trade in trades:
            update_price_history(trade, db)
        
        db.refresh(order)
    except Exception as e:
        print(f"Error matching order: {str(e)}")
        # Order still created, just not matched
    
    return OrderResponse(
        id=order.id,
        account_id=order.account_id,
        order_type=order.order_type,
        side=order.side,
        catchment=order.catchment,
        unit_type=order.unit_type,
        price_per_unit=order.price_per_unit,
        quantity_units=order.quantity_units,
        filled_quantity=order.filled_quantity,
        remaining_quantity=order.remaining_quantity,
        status=order.status,
        scheme_id=order.scheme_id,
        created_at=order.created_at.isoformat() if order.created_at else "",
        updated_at=order.updated_at.isoformat() if order.updated_at else ""
    )


@router.post("/orders/market", response_model=OrderResponse)
def create_market_order(request: CreateMarketOrderRequest, db: Session = Depends(get_db)):
    """
    Create a market order (buy or sell).
    Market orders execute immediately at the best available price.
    """
    try:
        print(f"[MARKET_ORDER] Received request: side={request.side}, catchment={request.catchment}, unit_type={request.unit_type}, quantity={request.quantity_units}, account_id={request.account_id}")
        
        # Validate inputs
        if request.side not in ["BUY", "SELL"]:
            raise HTTPException(status_code=400, detail="Side must be BUY or SELL")
        
        if request.unit_type not in ["nitrate", "phosphate"]:
            raise HTTPException(status_code=400, detail="Unit type must be nitrate or phosphate")
        
        if request.quantity_units <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
        
        # Get account
        account = db.query(Account).filter(Account.id == request.account_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        if not account.evm_address:
            raise HTTPException(status_code=400, detail="Account does not have an EVM address")
        
        # For BUY orders, validate available balance
        # Note: For market orders, we can't know the exact cost upfront, so we'll check during matching
        # But we can at least validate they have some balance
        if request.side == "BUY":
            has_sufficient, available_balance = check_buyer_has_sufficient_balance(
                buyer=account,
                required_amount_gbp=0.01,  # Just check they have some balance
                db=db
            )
            
            if not has_sufficient:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. Available: £{available_balance:,.2f}"
                )
        
        # For SELL orders, validate available credits
        scheme = None
        if request.side == "SELL":
            # Get seller's actual holdings to check if they have credits in the requested catchment
            from ..services.credits_summary import get_account_credits_summary
            
            # For landowners, pass trading_account_address so it checks trading account balances
            trading_account_address = os.getenv("TRADING_ACCOUNT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
            holdings = get_account_credits_summary(
                account, 
                db,
                trading_account_address=trading_account_address if account.role == AccountRole.LANDOWNER else None
            )
            
            # Filter holdings by the requested catchment and unit_type
            matching_holdings = [
                h for h in holdings
                if h["catchment"] == request.catchment.upper()
                and h["unit_type"] == request.unit_type.lower()
            ]
            
            if not matching_holdings:
                raise HTTPException(
                    status_code=400,
                    detail=f"No credits found in {request.catchment} catchment for {request.unit_type}. "
                           f"You can only sell credits you own in the specified catchment."
                )
            
            # Calculate total available credits across all schemes in this catchment/unit_type
            # For landowners, credits are in the trading account, so use trading_account_credits
            # For others, use the regular credits balance
            total_available_credits = 0
            for h in matching_holdings:
                if account.role == AccountRole.LANDOWNER:
                    # Landowners sell from trading account
                    trading_credits = h.get("trading_account_credits", 0)
                    locked = h.get("locked_credits", 0)
                    # Locked credits are on the trading account, so subtract from trading account balance
                    total_available_credits += max(0, trading_credits - locked)
                else:
                    # Others sell from their personal balance
                    total_available_credits += max(0, h["credits"] - h.get("locked_credits", 0))
            
            # Check existing reservations in this catchment/unit_type
            existing_listings = db.query(ExchangeListing).filter(
                ExchangeListing.owner_account_id == account.id,
                ExchangeListing.catchment == request.catchment.upper(),
                ExchangeListing.unit_type == request.unit_type.lower(),
                ExchangeListing.status == "ACTIVE"
            ).all()
            
            existing_orders = db.query(Order).filter(
                Order.account_id == account.id,
                Order.side == "SELL",
                Order.catchment == request.catchment.upper(),
                Order.unit_type == request.unit_type.lower(),
                Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
            ).all()
            
            reserved_credits = sum(listing.quantity_units for listing in existing_listings)
            reserved_credits += sum(order.remaining_quantity for order in existing_orders)
            
            free_credits = total_available_credits - reserved_credits
            if free_credits < 0:
                free_credits = 0
            
            if free_credits < request.quantity_units:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient free credits in {request.catchment} catchment for {request.unit_type}. "
                           f"Available: {free_credits:,} credits, Required: {request.quantity_units:,} credits."
                )
            
            # For SELL market orders, create separate orders for each scheme with available credits
            # Calculate available credits per scheme (after reservations)
            scheme_allocations = []
            remaining_to_allocate = request.quantity_units
            
            for holding in matching_holdings:
                if remaining_to_allocate <= 0:
                    break
                
                scheme_id = holding["scheme_id"]
                scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
                if not scheme:
                    continue
                
                # Calculate available credits for this scheme
                if account.role == AccountRole.LANDOWNER:
                    scheme_available = max(0, holding.get("trading_account_credits", 0) - holding.get("locked_credits", 0))
                else:
                    scheme_available = max(0, holding["credits"] - holding.get("locked_credits", 0))
                
                # Subtract already reserved credits for this scheme
                scheme_listings = db.query(ExchangeListing).filter(
                    ExchangeListing.owner_account_id == account.id,
                    ExchangeListing.scheme_id == scheme_id,
                    ExchangeListing.status == "ACTIVE"
                ).all()
                scheme_orders = db.query(Order).filter(
                    Order.account_id == account.id,
                    Order.side == "SELL",
                    Order.scheme_id == scheme_id,
                    Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
                ).all()
                
                scheme_reserved = sum(l.quantity_units for l in scheme_listings)
                scheme_reserved += sum(o.remaining_quantity for o in scheme_orders)
                scheme_free = max(0, scheme_available - scheme_reserved)
                
                if scheme_free > 0:
                    # Allocate credits from this scheme
                    allocate_from_scheme = min(scheme_free, remaining_to_allocate)
                    scheme_allocations.append({
                        "scheme": scheme,
                        "quantity": allocate_from_scheme,
                        "available": scheme_free
                    })
                    remaining_to_allocate -= allocate_from_scheme
            
            if remaining_to_allocate > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not allocate all credits across available schemes. "
                           f"Remaining: {remaining_to_allocate:,} credits. "
                           f"Created {len(scheme_allocations)} order(s) for {request.quantity_units - remaining_to_allocate:,} credits."
                )
            
            # Create separate orders for each scheme
            created_orders = []
            all_trades = []
            
            for allocation in scheme_allocations:
                order = Order(
                    account_id=request.account_id,
                    order_type="MARKET",
                    side=request.side,
                    catchment=request.catchment.upper(),
                    unit_type=request.unit_type.lower(),
                    price_per_unit=None,  # Market orders have no price
                    quantity_units=allocation["quantity"],
                    filled_quantity=0,
                    remaining_quantity=allocation["quantity"],
                    status="PENDING",
                    scheme_id=allocation["scheme"].id,
                    nft_token_id=allocation["scheme"].nft_token_id
                )
                
                db.add(order)
                db.flush()  # Flush to get order ID
                
                # Attempt to match the order immediately
                try:
                    print(f"[MARKET_ORDER] Attempting to match market {request.side} order for {request.catchment} {request.unit_type}, quantity: {allocation['quantity']}, scheme: {allocation['scheme'].name}")
                    trades = match_order(order, db)
                    print(f"[MARKET_ORDER] Match completed, created {len(trades)} trades")
                    all_trades.extend(trades)
                    
                    # Update price history for each trade
                    for trade in trades:
                        try:
                            update_price_history(trade, db)
                        except Exception as e:
                            print(f"[MARKET_ORDER] ERROR updating price history for trade {trade.id}: {str(e)}")
                    
                    db.refresh(order)
                    print(f"[MARKET_ORDER] Order {order.id} status after matching: {order.status}, filled: {order.filled_quantity}, remaining: {order.remaining_quantity}")
                    
                    # If market order couldn't be fully filled, cancel remaining
                    if order.remaining_quantity > 0:
                        if order.filled_quantity == 0:
                            # No matches at all - reject the order
                            print(f"[MARKET_ORDER] Market order {order.id} could not be filled - no matching orders available. Cancelling order.")
                            order.status = "CANCELLED"
                        else:
                            # Partially filled
                            print(f"[MARKET_ORDER] Market order {order.id} partially filled ({order.filled_quantity}/{order.quantity_units}), cancelling remaining {order.remaining_quantity}")
                            order.status = "CANCELLED"
                    elif order.remaining_quantity == 0 and order.filled_quantity > 0:
                        print(f"[MARKET_ORDER] Market order {order.id} fully filled: {order.filled_quantity} credits")
                except Exception as e:
                    print(f"[MARKET_ORDER] Error matching order {order.id}: {str(e)}")
                
                created_orders.append(order)
            
            db.commit()
            
            # If multiple orders were created, return the first one
            if len(created_orders) > 1:
                print(f"[MARKET_ORDER] Created {len(created_orders)} separate orders across {len(scheme_allocations)} schemes")
                # Check if any orders couldn't be filled at all
                unfilled_orders = [o for o in created_orders if o.filled_quantity == 0]
                if unfilled_orders and len(unfilled_orders) == len(created_orders):
                    # All orders unfilled - return error
                    raise HTTPException(
                        status_code=400,
                        detail=f"Market {request.side} order could not be executed. No matching orders available in the order book for {request.catchment} {request.unit_type}."
                    )
                order = created_orders[0]
            else:
                order = created_orders[0]
                # Check if order couldn't be filled at all
                if order.filled_quantity == 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Market {request.side} order could not be executed. No matching orders available in the order book for {request.catchment} {request.unit_type}."
                    )
        
        # For BUY market orders, find a scheme (optional, for tracking)
        scheme = None
        if request.side == "BUY":
            # Try to find a scheme in the catchment/unit_type (optional for buy orders)
            scheme = db.query(Scheme).filter(
                Scheme.catchment == request.catchment.upper(),
                Scheme.unit_type == request.unit_type.lower()
            ).first()
        
        # Create market order (for BUY orders)
        order = Order(
            account_id=request.account_id,
            order_type="MARKET",
            side=request.side,
            catchment=request.catchment.upper(),
            unit_type=request.unit_type.lower(),
            price_per_unit=None,  # Market orders have no price
            quantity_units=request.quantity_units,
            filled_quantity=0,
            remaining_quantity=request.quantity_units,
            status="PENDING",
            scheme_id=scheme.id if scheme else None,
            nft_token_id=scheme.nft_token_id if scheme else None
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Attempt to match the order immediately
        try:
            print(f"[MARKET_ORDER] Attempting to match market {request.side} order for {request.catchment} {request.unit_type}, quantity: {request.quantity_units}")
            trades = match_order(order, db)
            print(f"[MARKET_ORDER] Match completed, created {len(trades)} trades")
            
            # Update price history for each trade
            for trade in trades:
                try:
                    update_price_history(trade, db)
                except Exception as e:
                    print(f"[MARKET_ORDER] ERROR updating price history for trade {trade.id}: {str(e)}")
                    db.rollback()
            
            db.refresh(order)
            print(f"[MARKET_ORDER] Order status after matching: {order.status}, filled: {order.filled_quantity}, remaining: {order.remaining_quantity}")
            
            # If market order couldn't be fully filled, cancel remaining
            if order.remaining_quantity > 0:
                if order.filled_quantity == 0:
                    # No matches at all - reject the order
                    print(f"[MARKET_ORDER] Market order could not be filled - no matching orders available. Cancelling order.")
                    order.status = "CANCELLED"
                    db.commit()
                    db.refresh(order)
                    # Return error response
                    raise HTTPException(
                        status_code=400,
                        detail=f"Market {request.side} order could not be executed. No matching orders available in the order book for {request.catchment} {request.unit_type}."
                    )
                else:
                    # Partially filled
                    print(f"[MARKET_ORDER] Market order partially filled ({order.filled_quantity}/{order.quantity_units}), cancelling remaining {order.remaining_quantity}")
                    order.status = "CANCELLED"
                    db.commit()
                    db.refresh(order)
            elif order.remaining_quantity == 0 and order.filled_quantity > 0:
                print(f"[MARKET_ORDER] Market order fully filled: {order.filled_quantity} credits")
        except HTTPException:
            # Re-raise HTTPExceptions (like our "no matching orders" error)
            raise
        except Exception as e:
            print(f"[MARKET_ORDER] ERROR matching market order: {str(e)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            # Refresh order to get current state
            db.refresh(order)
            # Order still created, but might not be matched
            raise HTTPException(status_code=500, detail=f"Failed to execute market order: {str(e)}")
        
        return OrderResponse(
            id=order.id,
            account_id=order.account_id,
            order_type=order.order_type,
            side=order.side,
            catchment=order.catchment,
            unit_type=order.unit_type,
            price_per_unit=order.price_per_unit,
            quantity_units=order.quantity_units,
            filled_quantity=order.filled_quantity,
            remaining_quantity=order.remaining_quantity,
            status=order.status,
            scheme_id=order.scheme_id,
            created_at=order.created_at.isoformat() if order.created_at else "",
            updated_at=order.updated_at.isoformat() if order.updated_at else ""
        )
    except HTTPException:
        # Re-raise HTTPExceptions (they already have proper status codes)
        raise
    except Exception as e:
        # Catch any unexpected errors and return proper HTTP response
        print(f"[MARKET_ORDER] UNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/orderbook", response_model=OrderBookResponse)
def get_orderbook(
    catchment: str = Query(..., description="Catchment to get order book for"),
    unit_type: str = Query(..., description="Unit type (nitrate/phosphate)"),
    db: Session = Depends(get_db)
):
    """
    Get the order book (bids and asks) for a specific catchment + unit_type.
    """
    # Normalize catchment and unit_type for filtering
    normalized_catchment = catchment.upper()
    normalized_unit_type = unit_type.lower()
    
    print(f"[ORDERBOOK] Fetching order book for catchment='{normalized_catchment}', unit_type='{normalized_unit_type}'")
    
    # Get pending/partially filled orders - use case-insensitive comparison with func.upper()
    from sqlalchemy import func
    buy_orders = db.query(Order).filter(
        Order.side == "BUY",
        func.upper(Order.catchment) == normalized_catchment,
        func.lower(Order.unit_type) == normalized_unit_type,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).order_by(Order.price_per_unit.desc(), Order.created_at.asc()).all()
    
    sell_orders = db.query(Order).filter(
        Order.side == "SELL",
        func.upper(Order.catchment) == normalized_catchment,
        func.lower(Order.unit_type) == normalized_unit_type,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).order_by(Order.price_per_unit.asc(), Order.created_at.asc()).all()
    
    print(f"[ORDERBOOK] Found {len(buy_orders)} buy orders and {len(sell_orders)} sell orders")
    if sell_orders:
        print(f"[ORDERBOOK] First sell order: ID={sell_orders[0].id}, catchment='{sell_orders[0].catchment}', unit_type='{sell_orders[0].unit_type}'")
        # Verify all sell orders have correct catchment
        for order in sell_orders:
            if order.catchment.upper() != normalized_catchment:
                print(f"[ORDERBOOK] WARNING: Order {order.id} has catchment '{order.catchment}' but filter requested '{normalized_catchment}'")
    
    # Aggregate by price
    bids_dict = {}
    for order in buy_orders:
        if order.price_per_unit:
            price = order.price_per_unit
            if price not in bids_dict:
                bids_dict[price] = 0
            bids_dict[price] += order.remaining_quantity
    
    asks_dict = {}
    for order in sell_orders:
        if order.price_per_unit:
            price = order.price_per_unit
            if price not in asks_dict:
                asks_dict[price] = 0
            asks_dict[price] += order.remaining_quantity
    
    # Convert to list and calculate totals
    bids = []
    total_bids = 0
    for price in sorted(bids_dict.keys(), reverse=True):
        quantity = bids_dict[price]
        total_bids += quantity
        bids.append(OrderBookEntry(price=price, quantity=quantity, total=total_bids))
    
    asks = []
    total_asks = 0
    for price in sorted(asks_dict.keys()):
        quantity = asks_dict[price]
        total_asks += quantity
        asks.append(OrderBookEntry(price=price, quantity=quantity, total=total_asks))
    
    return OrderBookResponse(bids=bids, asks=asks)


@router.get("/price-history", response_model=List[CandlestickData])
def get_price_history_endpoint(
    catchment: str = Query(..., description="Catchment"),
    unit_type: str = Query(..., description="Unit type (nitrate/phosphate)"),
    timeframe: str = Query(..., description="Timeframe: 1min, 5min, 15min, 1hr, 4hr, 1day"),
    limit: int = Query(100, description="Maximum number of candles to return"),
    db: Session = Depends(get_db)
):
    """
    Get price history (candlestick data) for a catchment + unit_type + timeframe.
    """
    candles = get_price_history(catchment, unit_type, timeframe, limit, db)
    
    return [
        CandlestickData(
            timestamp=candle["timestamp"],
            open=candle["open"],
            high=candle["high"],
            low=candle["low"],
            close=candle["close"],
            volume=candle["volume"]
        )
        for candle in candles
    ]


@router.get("/orders/open", response_model=List[OrderResponse])
def get_open_orders(
    account_id: int = Query(..., description="Account ID"),
    catchment: Optional[str] = Query(None, description="Filter by catchment"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    db: Session = Depends(get_db)
):
    """
    Get user's open orders (pending or partially filled).
    """
    query = db.query(Order).filter(
        Order.account_id == account_id,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    )
    
    if catchment:
        query = query.filter(Order.catchment == catchment.upper())
    
    if unit_type:
        query = query.filter(Order.unit_type == unit_type.lower())
    
    orders = query.order_by(Order.created_at.desc()).all()
    
    return [
        OrderResponse(
            id=order.id,
            account_id=order.account_id,
            order_type=order.order_type,
            side=order.side,
            catchment=order.catchment,
            unit_type=order.unit_type,
            price_per_unit=order.price_per_unit,
            quantity_units=order.quantity_units,
            filled_quantity=order.filled_quantity,
            remaining_quantity=order.remaining_quantity,
            status=order.status,
            scheme_id=order.scheme_id,
            created_at=order.created_at.isoformat() if order.created_at else "",
            updated_at=order.updated_at.isoformat() if order.updated_at else ""
        )
        for order in orders
    ]


@router.delete("/orders/{order_id}")
def cancel_order(
    order_id: int = Path(..., description="Order ID to cancel"),
    account_id: int = Query(..., description="Account ID (must own the order)"),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending or partially filled order.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.account_id != account_id:
        raise HTTPException(status_code=403, detail="You can only cancel your own orders")
    
    if order.status not in ["PENDING", "PARTIALLY_FILLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status: {order.status}")
    
    order.status = "CANCELLED"
    db.commit()
    
    return {"success": True, "message": f"Order {order_id} cancelled"}


@router.get("/orders/completed", response_model=List[OrderResponse])
def get_completed_orders(
    account_id: int = Query(..., description="Account ID"),
    catchment: Optional[str] = Query(None, description="Filter by catchment"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    limit: int = Query(50, description="Maximum number of orders to return"),
    db: Session = Depends(get_db)
):
    """
    Get user's completed orders (filled or cancelled).
    """
    query = db.query(Order).filter(
        Order.account_id == account_id,
        Order.status.in_(["FILLED", "CANCELLED"])
    )
    
    if catchment:
        query = query.filter(Order.catchment == catchment.upper())
    
    if unit_type:
        query = query.filter(Order.unit_type == unit_type.lower())
    
    orders = query.order_by(Order.created_at.desc()).limit(limit).all()
    
    return [
        OrderResponse(
            id=order.id,
            account_id=order.account_id,
            order_type=order.order_type,
            side=order.side,
            catchment=order.catchment,
            unit_type=order.unit_type,
            price_per_unit=order.price_per_unit,
            quantity_units=order.quantity_units,
            filled_quantity=order.filled_quantity,
            remaining_quantity=order.remaining_quantity,
            status=order.status,
            scheme_id=order.scheme_id,
            created_at=order.created_at.isoformat() if order.created_at else "",
            updated_at=order.updated_at.isoformat() if order.updated_at else ""
        )
        for order in orders
    ]


@router.get("/trades", response_model=List[TradeResponse])
def get_trades(
    account_id: int = Query(..., description="Account ID"),
    catchment: Optional[str] = Query(None, description="Filter by catchment"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type"),
    limit: int = Query(50, description="Maximum number of trades to return"),
    db: Session = Depends(get_db)
):
    """
    Get trades where the user was either buyer or seller.
    """
    from ..models import Scheme
    query = db.query(Trade).filter(
        (Trade.buyer_account_id == account_id) | (Trade.seller_account_id == account_id)
    )
    
    if catchment or unit_type:
        # Join with Scheme to filter by catchment/unit_type
        query = query.join(Scheme, Trade.scheme_id == Scheme.id)
        if catchment:
            query = query.filter(Scheme.catchment == catchment.upper())
        if unit_type:
            query = query.filter(Scheme.unit_type == unit_type.lower())
    
    trades = query.order_by(Trade.created_at.desc()).limit(limit).all()
    
    return [
        TradeResponse(
            id=trade.id,
            listing_id=trade.listing_id,
            buyer_account_id=trade.buyer_account_id,
            seller_account_id=trade.seller_account_id,
            scheme_id=trade.scheme_id,
            quantity_units=trade.quantity_units,
            price_per_unit=trade.price_per_unit,
            total_price=trade.total_price,
            transaction_hash=trade.transaction_hash,
            created_at=trade.created_at.isoformat() if trade.created_at else ""
        )
        for trade in trades
    ]
