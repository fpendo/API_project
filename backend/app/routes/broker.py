from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from ..db import SessionLocal
from ..models import Account, AccountRole, Trade, BotOrder, MarketMakingBot, Scheme, SellLadderBot, SellLadderBotOrder
from ..services.broker import get_broker_client_holdings, get_broker_house_holdings, get_broker_mandates
from ..services.market_making_bot import (
    create_bot, get_bot, list_bots, update_bot_strategy,
    activate_bot, deactivate_bot,
    assign_client_to_bot, assign_house_to_bot, remove_assignment, get_bot_assignments,
    place_bot_orders, get_total_available_credits
)
from ..services.sell_ladder_bot import (
    create_sell_ladder_bot, get_sell_ladder_bot, list_sell_ladder_bots, update_sell_ladder_bot_strategy,
    activate_sell_ladder_bot, deactivate_sell_ladder_bot,
    assign_client_to_sell_ladder_bot, assign_house_to_sell_ladder_bot, remove_sell_ladder_assignment,
    get_sell_ladder_bot_assignments, place_sell_ladder_orders, get_total_available_credits as get_sell_ladder_total_credits
)
import os
import json

router = APIRouter()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ClientHolding(BaseModel):
    scheme_id: int
    nft_token_id: int
    scheme_name: str
    catchment: str
    unit_type: str
    credits: int
    tonnes: float
    locked_credits: int
    available_credits: int
    landowner_names: str
    assigned_date: str
    total_assigned: int
    mandates: List[dict]


class ClientHoldingsResponse(BaseModel):
    broker_account_id: int
    broker_name: str
    evm_address: str
    holdings: List[ClientHolding]
    total_credits: int
    total_tonnes: float


class HouseHolding(BaseModel):
    scheme_id: int
    nft_token_id: int
    scheme_name: str
    catchment: str
    unit_type: str
    credits: int
    tonnes: float
    locked_credits: int
    available_credits: int
    landowner_names: str
    received_date: str
    total_fees: int
    fees: List[dict]


class HouseHoldingsResponse(BaseModel):
    house_address: str
    holdings: List[HouseHolding]
    total_credits: int
    total_tonnes: float


class BrokerMandateItem(BaseModel):
    mandate_id: int
    landowner_id: int
    landowner_name: str
    scheme_id: int
    scheme_name: str
    catchment: str
    unit_type: str
    total_credits: int
    client_credits: int
    fee_credits: int
    fee_percentage: float
    is_active: bool
    is_recalled: bool
    created_at: str
    recalled_at: Optional[str]
    fee_transaction_hash: Optional[str]
    client_transaction_hash: Optional[str]
    recall_transaction_hash: Optional[str]


class BrokerMandatesResponse(BaseModel):
    broker_account_id: int
    broker_name: str
    mandates: List[BrokerMandateItem]


@router.get("/{broker_account_id}/client-holdings", response_model=ClientHoldingsResponse)
def get_client_holdings(
    broker_account_id: int = Path(..., description="Broker account ID"),
    db: Session = Depends(get_db)
):
    """
    Get client holdings for a broker (credits assigned from landowners).
    """
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    if broker.role.value != "BROKER":
        raise HTTPException(status_code=400, detail="Account is not a broker")
    
    holdings_data = get_broker_client_holdings(broker, db)
    
    total_credits = sum(item["credits"] for item in holdings_data)
    total_tonnes = round(sum(item["tonnes"] for item in holdings_data), 4)
    
    holdings = [
        ClientHolding(
            scheme_id=item["scheme_id"],
            nft_token_id=item["nft_token_id"],
            scheme_name=item["scheme_name"],
            catchment=item["catchment"],
            unit_type=item["unit_type"],
            credits=item["credits"],
            tonnes=item["tonnes"],
            locked_credits=item["locked_credits"],
            available_credits=item["available_credits"],
            landowner_names=item["landowner_names"],
            assigned_date=item["assigned_date"],
            total_assigned=item["total_assigned"],
            mandates=item["mandates"]
        )
        for item in holdings_data
    ]
    
    return ClientHoldingsResponse(
        broker_account_id=broker.id,
        broker_name=broker.name,
        evm_address=broker.evm_address or "",
        holdings=holdings,
        total_credits=total_credits,
        total_tonnes=total_tonnes
    )


@router.get("/{broker_account_id}/house-holdings", response_model=HouseHoldingsResponse)
def get_house_holdings(
    broker_account_id: int = Path(..., description="Broker account ID"),
    db: Session = Depends(get_db)
):
    """
    Get house holdings (5% fee payments) for the broker.
    """
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    if broker.role.value != "BROKER":
        raise HTTPException(status_code=400, detail="Account is not a broker")
    
    house_address = os.getenv("BROKER_HOUSE_ADDRESS")
    
    if not house_address:
        raise HTTPException(
            status_code=500,
            detail="BROKER_HOUSE_ADDRESS not configured"
        )
    
    holdings_data = get_broker_house_holdings(house_address, db)
    
    total_credits = sum(item["credits"] for item in holdings_data)
    total_tonnes = round(sum(item["tonnes"] for item in holdings_data), 4)
    
    holdings = [
        HouseHolding(
            scheme_id=item["scheme_id"],
            nft_token_id=item["nft_token_id"],
            scheme_name=item["scheme_name"],
            catchment=item["catchment"],
            unit_type=item["unit_type"],
            credits=item["credits"],
            tonnes=item["tonnes"],
            locked_credits=item["locked_credits"],
            available_credits=item["available_credits"],
            landowner_names=item["landowner_names"],
            received_date=item["received_date"],
            total_fees=item["total_fees"],
            fees=item["fees"]
        )
        for item in holdings_data
    ]
    
    return HouseHoldingsResponse(
        house_address=house_address,
        holdings=holdings,
        total_credits=total_credits,
        total_tonnes=total_tonnes
    )


@router.get("/{broker_account_id}/mandates", response_model=BrokerMandatesResponse)
def get_mandates(
    broker_account_id: int = Path(..., description="Broker account ID"),
    db: Session = Depends(get_db)
):
    """
    Get all mandates (active and recalled) for a broker.
    """
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    if broker.role.value != "BROKER":
        raise HTTPException(status_code=400, detail="Account is not a broker")
    
    mandates_data = get_broker_mandates(broker, db)
    
    mandates = [
        BrokerMandateItem(
            mandate_id=item["mandate_id"],
            landowner_id=item["landowner_id"],
            landowner_name=item["landowner_name"],
            scheme_id=item["scheme_id"],
            scheme_name=item["scheme_name"],
            catchment=item["catchment"],
            unit_type=item["unit_type"],
            total_credits=item["total_credits"],
            client_credits=item["client_credits"],
            fee_credits=item["fee_credits"],
            fee_percentage=item["fee_percentage"],
            is_active=item["is_active"],
            is_recalled=item["is_recalled"],
            created_at=item["created_at"],
            recalled_at=item["recalled_at"],
            fee_transaction_hash=item["fee_transaction_hash"],
            client_transaction_hash=item["client_transaction_hash"],
            recall_transaction_hash=item["recall_transaction_hash"]
        )
        for item in mandates_data
    ]
    
    return BrokerMandatesResponse(
        broker_account_id=broker.id,
        broker_name=broker.name,
        mandates=mandates
    )


# Bot Management Endpoints

class CreateBotRequest(BaseModel):
    catchment: str
    unit_type: str
    name: str
    strategy_config: Dict


class BotResponse(BaseModel):
    id: int
    broker_account_id: int
    catchment: str
    unit_type: str
    name: str
    is_active: bool
    strategy_config: Dict
    created_at: str
    updated_at: str


class AssignClientRequest(BaseModel):
    mandate_id: int


class BotAssignmentResponse(BaseModel):
    id: int
    bot_id: int
    mandate_id: Optional[int]
    is_house_account: bool
    priority_order: int
    assigned_at: str
    is_active: bool


@router.post("/{broker_account_id}/bots", response_model=BotResponse)
def create_bot_endpoint(
    request: CreateBotRequest,
    broker_account_id: int = Path(..., description="Broker account ID"),
    db: Session = Depends(get_db)
):
    """Create a new market making bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    if broker.role.value != "BROKER":
        raise HTTPException(status_code=400, detail="Account is not a broker")
    
    try:
        bot = create_bot(
            broker_id=broker_account_id,
            catchment=request.catchment,
            unit_type=request.unit_type,
            name=request.name,
            strategy_config=request.strategy_config,
            db=db
        )
        
        return BotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{broker_account_id}/bots", response_model=List[BotResponse])
def list_bots_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    catchment: Optional[str] = None,
    unit_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all bots for a broker."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    if broker.role.value != "BROKER":
        raise HTTPException(status_code=400, detail="Account is not a broker")
    
    bots = list_bots(broker_account_id, catchment, unit_type, db)
    
    return [
        BotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
        for bot in bots
    ]


@router.get("/{broker_account_id}/bots/{bot_id}", response_model=BotResponse)
def get_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Get bot details."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    bot = get_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    return BotResponse(
        id=bot.id,
        broker_account_id=bot.broker_account_id,
        catchment=bot.catchment,
        unit_type=bot.unit_type,
        name=bot.name,
        is_active=bool(bot.is_active),
        strategy_config=json.loads(bot.strategy_config),
        created_at=bot.created_at.isoformat() if bot.created_at else "",
        updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
    )


class UpdateBotStrategyRequest(BaseModel):
    strategy_config: Dict


@router.put("/{broker_account_id}/bots/{bot_id}", response_model=BotResponse)
def update_bot_strategy_endpoint(
    request: UpdateBotStrategyRequest,
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Update bot strategy configuration."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        bot = update_bot_strategy(bot_id, request.strategy_config, db)
        
        if bot.broker_account_id != broker_account_id:
            raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
        
        return BotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/bots/{bot_id}/activate", response_model=BotResponse)
def activate_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Activate a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        bot = activate_bot(bot_id, db)
        
        if bot.broker_account_id != broker_account_id:
            raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
        
        return BotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/bots/{bot_id}/deactivate", response_model=BotResponse)
def deactivate_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Deactivate a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        bot = deactivate_bot(bot_id, db)
        
        if bot.broker_account_id != broker_account_id:
            raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
        
        return BotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{broker_account_id}/bots/{bot_id}")
def delete_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Delete a market making bot."""
    from ..models import BotAssignment, FIFOCreditQueue, BotOrder
    
    bot = get_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    # Deactivate first (this cancels orders)
    deactivate_bot(bot_id, db)
    
    # Delete related records first (to avoid foreign key constraint violations)
    # Delete bot orders
    db.query(BotOrder).filter(BotOrder.bot_id == bot_id).delete()
    
    # Delete FIFO queue entries
    db.query(FIFOCreditQueue).filter(FIFOCreditQueue.bot_id == bot_id).delete()
    
    # Delete assignments
    db.query(BotAssignment).filter(BotAssignment.bot_id == bot_id).delete()
    
    # Delete bot
    db.delete(bot)
    db.commit()
    
    return {"message": "Bot deleted successfully"}


@router.post("/{broker_account_id}/bots/{bot_id}/assign-client", response_model=BotAssignmentResponse)
def assign_client_to_bot_endpoint(
    request: AssignClientRequest,
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Assign a client mandate to a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        assignment = assign_client_to_bot(bot_id, request.mandate_id, db)
        
        return BotAssignmentResponse(
            id=assignment.id,
            bot_id=assignment.bot_id,
            mandate_id=assignment.mandate_id,
            is_house_account=bool(assignment.is_house_account),
            priority_order=assignment.priority_order,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else "",
            is_active=bool(assignment.is_active)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/bots/{bot_id}/assign-house", response_model=BotAssignmentResponse)
def assign_house_to_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Assign house account to a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        assignment = assign_house_to_bot(bot_id, db)
        
        return BotAssignmentResponse(
            id=assignment.id,
            bot_id=assignment.bot_id,
            mandate_id=assignment.mandate_id,
            is_house_account=bool(assignment.is_house_account),
            priority_order=assignment.priority_order,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else "",
            is_active=bool(assignment.is_active)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{broker_account_id}/bots/{bot_id}/assignments", response_model=List[BotAssignmentResponse])
def get_bot_assignments_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Get all assignments for a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    assignments = get_bot_assignments(bot_id, db)
    
    return [
        BotAssignmentResponse(
            id=assignment.id,
            bot_id=assignment.bot_id,
            mandate_id=assignment.mandate_id,
            is_house_account=bool(assignment.is_house_account),
            priority_order=assignment.priority_order,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else "",
            is_active=bool(assignment.is_active)
        )
        for assignment in assignments
    ]


@router.delete("/{broker_account_id}/bots/{bot_id}/assignments/{assignment_id}")
def remove_assignment_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    assignment_id: int = Path(..., description="Assignment ID"),
    db: Session = Depends(get_db)
):
    """Remove an assignment from a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        remove_assignment(assignment_id, db)
        return {"message": "Assignment removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/bots/{bot_id}/place-orders")
def place_bot_orders_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Manually trigger order placement for a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    try:
        place_bot_orders(bot_id, db)
        return {"message": "Orders placed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{broker_account_id}/bots/{bot_id}/queue")
def get_bot_queue_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Bot ID"),
    db: Session = Depends(get_db)
):
    """Get FIFO queue status for a bot."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    from ..models import FIFOCreditQueue
    
    queues = db.query(FIFOCreditQueue).filter(
        FIFOCreditQueue.bot_id == bot_id
    ).order_by(
        FIFOCreditQueue.queue_position.asc(),
        FIFOCreditQueue.id.asc()
    ).all()
    
    return {
        "bot_id": bot_id,
        "total_available_credits": get_total_available_credits(bot_id, db),
        "queue_entries": [
            {
                "id": q.id,
                "assignment_id": q.assignment_id,
                "scheme_id": q.scheme_id,
                "credits_available": q.credits_available,
                "credits_traded": q.credits_traded,
                "queue_position": q.queue_position
            }
            for q in queues
        ]
    }


class BotTradeItem(BaseModel):
    trade_id: int
    bot_id: int
    bot_name: str
    side: str  # "BUY" or "SELL"
    scheme_id: int
    scheme_name: str
    quantity_units: int
    price_per_unit: float
    total_price: float
    counterparty_account_id: int
    counterparty_name: str
    transaction_hash: Optional[str]
    created_at: str
    pnl: Optional[float] = None  # Profit/Loss for house account trades


class BotTradesResponse(BaseModel):
    broker_account_id: int
    broker_name: str
    trades: List[BotTradeItem]
    total_pnl: float


@router.get("/{broker_account_id}/trades", response_model=BotTradesResponse)
def get_broker_trades(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all trades executed by broker's bots."""
    broker = db.query(Account).filter(Account.id == broker_account_id).first()
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker account not found")
    
    # Get all bot orders for this broker
    query = db.query(BotOrder).join(MarketMakingBot).filter(
        MarketMakingBot.broker_account_id == broker_account_id
    )
    
    if bot_id:
        query = query.filter(BotOrder.bot_id == bot_id)
    
    bot_orders = query.all()
    bot_order_ids = [bo.order_id for bo in bot_orders]
    
    if not bot_order_ids:
        return BotTradesResponse(
            broker_account_id=broker.id,
            broker_name=broker.name,
            trades=[],
            total_pnl=0.0
        )
    
    # Get all orders that belong to bots
    from ..models import Order
    bot_order_objs = db.query(Order).filter(Order.id.in_(bot_order_ids)).all()
    bot_order_map = {o.id: o for o in bot_order_objs}
    
    # Get all trades where broker's orders were involved
    trades = db.query(Trade).filter(
        ((Trade.buyer_account_id == broker_account_id) | (Trade.seller_account_id == broker_account_id))
    ).order_by(Trade.created_at.desc()).all()
    
    # Filter to only trades from bot orders by checking order fills
    bot_trades = []
    for trade in trades:
        # Find orders that were filled around this trade time and match the trade
        # Check if any bot order matches this trade
        matching_order = None
        for order_id in bot_order_ids:
            order = bot_order_map.get(order_id)
            if not order:
                continue
            
            # Check if this order could have generated this trade
            # Order must match scheme, side, and be filled around trade time
            if (order.scheme_id == trade.scheme_id and 
                order.filled_quantity > 0 and
                abs((order.updated_at - trade.created_at).total_seconds()) < 60):  # Within 60 seconds
                
                # Verify side matches
                if ((order.side == "SELL" and trade.seller_account_id == broker_account_id) or
                    (order.side == "BUY" and trade.buyer_account_id == broker_account_id)):
                    matching_order = order
                    break
        
        if matching_order and matching_order.id in bot_order_ids:
            bot_order = db.query(BotOrder).filter(BotOrder.order_id == matching_order.id).first()
            bot = db.query(MarketMakingBot).filter(MarketMakingBot.id == bot_order.bot_id).first()
            scheme = db.query(Scheme).filter(Scheme.id == trade.scheme_id).first()
            
            # Determine counterparty
            if trade.buyer_account_id == broker_account_id:
                counterparty = db.query(Account).filter(Account.id == trade.seller_account_id).first()
                side = "BUY"
            else:
                counterparty = db.query(Account).filter(Account.id == trade.buyer_account_id).first()
                side = "SELL"
            
            # Calculate PnL for house account trades
            pnl = None
            if bot_order and side == "SELL":
                # Check if this trade is from house account
                # Find the assignment and queue entry for this scheme
                from ..models import FIFOCreditQueue, BotAssignment
                
                # Get all house account assignments for this bot
                house_assignments = db.query(BotAssignment).filter(
                    BotAssignment.bot_id == bot.id,
                    BotAssignment.is_house_account == 1,
                    BotAssignment.is_active == 1
                ).all()
                
                house_assignment_ids = [a.id for a in house_assignments]
                
                # Check if there's a house queue entry for this scheme
                house_queue = None
                if house_assignment_ids:
                    house_queue = db.query(FIFOCreditQueue).filter(
                        FIFOCreditQueue.bot_id == bot.id,
                        FIFOCreditQueue.scheme_id == scheme.id,
                        FIFOCreditQueue.assignment_id.in_(house_assignment_ids)
                    ).first()
                
                if house_queue:
                    # House account trade - credits were received as fees (no cost basis)
                    # PnL = full sale price (pure profit)
                    pnl = trade.total_price
                else:
                    # Client account trade - use strategy price as cost basis
                    cost_basis = bot_order.strategy_price
                    sale_price = trade.price_per_unit
                    pnl = (sale_price - cost_basis) * trade.quantity_units
            
            bot_trades.append({
                "trade_id": trade.id,
                "bot_id": bot.id,
                "bot_name": bot.name,
                "side": side,
                "scheme_id": scheme.id,
                "scheme_name": scheme.name,
                "quantity_units": trade.quantity_units,
                "price_per_unit": trade.price_per_unit,
                "total_price": trade.total_price,
                "counterparty_account_id": counterparty.id if counterparty else 0,
                "counterparty_name": counterparty.name if counterparty else "Unknown",
                "transaction_hash": trade.transaction_hash,
                "created_at": trade.created_at.isoformat() if trade.created_at else "",
                "pnl": pnl
            })
    
    # Sort by created_at descending
    bot_trades.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Calculate total PnL (only for house account trades)
    total_pnl = sum(t.get("pnl", 0) or 0 for t in bot_trades if t.get("pnl") is not None)
    
    return BotTradesResponse(
        broker_account_id=broker.id,
        broker_name=broker.name,
        trades=[BotTradeItem(**t) for t in bot_trades],
        total_pnl=round(total_pnl, 2)
    )


# Sell Ladder Bot Management Endpoints

class CreateSellLadderBotRequest(BaseModel):
    catchment: str
    unit_type: str
    name: str
    strategy_config: Dict


class UpdateSellLadderBotRequest(BaseModel):
    strategy_config: Dict


class SellLadderBotResponse(BaseModel):
    id: int
    broker_account_id: int
    catchment: str
    unit_type: str
    name: str
    is_active: bool
    strategy_config: Dict
    created_at: str
    updated_at: str


class SellLadderBotAssignmentResponse(BaseModel):
    id: int
    bot_id: int
    mandate_id: Optional[int]
    is_house_account: bool
    priority_order: int
    assigned_at: str
    is_active: bool


class AssignClientToSellLadderRequest(BaseModel):
    mandate_id: int


@router.post("/{broker_account_id}/sell-ladder-bots", response_model=SellLadderBotResponse)
def create_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    request: CreateSellLadderBotRequest = ...,
    db: Session = Depends(get_db)
):
    """Create a new sell ladder bot."""
    try:
        bot = create_sell_ladder_bot(
            broker_id=broker_account_id,
            catchment=request.catchment,
            unit_type=request.unit_type,
            name=request.name,
            strategy_config=request.strategy_config,
            db=db
        )
        
        return SellLadderBotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{broker_account_id}/sell-ladder-bots", response_model=List[SellLadderBotResponse])
def list_sell_ladder_bots_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    db: Session = Depends(get_db)
):
    """List all sell ladder bots for a broker."""
    bots = list_sell_ladder_bots(broker_account_id, db=db)
    
    return [
        SellLadderBotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
        for bot in bots
    ]


@router.get("/{broker_account_id}/sell-ladder-bots/{bot_id}", response_model=SellLadderBotResponse)
def get_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Get sell ladder bot details."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    return SellLadderBotResponse(
        id=bot.id,
        broker_account_id=bot.broker_account_id,
        catchment=bot.catchment,
        unit_type=bot.unit_type,
        name=bot.name,
        is_active=bool(bot.is_active),
        strategy_config=json.loads(bot.strategy_config),
        created_at=bot.created_at.isoformat() if bot.created_at else "",
        updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
    )


@router.put("/{broker_account_id}/sell-ladder-bots/{bot_id}", response_model=SellLadderBotResponse)
def update_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    request: UpdateSellLadderBotRequest = ...,
    db: Session = Depends(get_db)
):
    """Update sell ladder bot strategy."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    try:
        bot = update_sell_ladder_bot_strategy(bot_id, request.strategy_config, db)
        
        return SellLadderBotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/sell-ladder-bots/{bot_id}/activate", response_model=SellLadderBotResponse)
def activate_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Activate a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    try:
        bot = activate_sell_ladder_bot(bot_id, db)
        
        return SellLadderBotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/sell-ladder-bots/{bot_id}/deactivate", response_model=SellLadderBotResponse)
def deactivate_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Deactivate a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    try:
        bot = deactivate_sell_ladder_bot(bot_id, db)
        
        return SellLadderBotResponse(
            id=bot.id,
            broker_account_id=bot.broker_account_id,
            catchment=bot.catchment,
            unit_type=bot.unit_type,
            name=bot.name,
            is_active=bool(bot.is_active),
            strategy_config=json.loads(bot.strategy_config),
            created_at=bot.created_at.isoformat() if bot.created_at else "",
            updated_at=bot.updated_at.isoformat() if bot.updated_at else ""
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{broker_account_id}/sell-ladder-bots/{bot_id}")
def delete_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Delete a sell ladder bot."""
    from ..models import SellLadderBotAssignment, SellLadderFIFOCreditQueue, SellLadderBotOrder
    
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    # Deactivate first (this cancels orders)
    deactivate_sell_ladder_bot(bot_id, db)
    
    # Delete related records first (to avoid foreign key constraint violations)
    # Delete bot orders
    db.query(SellLadderBotOrder).filter(SellLadderBotOrder.bot_id == bot_id).delete()
    
    # Delete FIFO queue entries
    db.query(SellLadderFIFOCreditQueue).filter(SellLadderFIFOCreditQueue.bot_id == bot_id).delete()
    
    # Delete assignments
    db.query(SellLadderBotAssignment).filter(SellLadderBotAssignment.bot_id == bot_id).delete()
    
    # Delete bot
    db.delete(bot)
    db.commit()
    
    return {"message": "Sell ladder bot deleted successfully"}


@router.post("/{broker_account_id}/sell-ladder-bots/{bot_id}/assign-client", response_model=SellLadderBotAssignmentResponse)
def assign_client_to_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    request: AssignClientToSellLadderRequest = ...,
    db: Session = Depends(get_db)
):
    """Assign a client mandate to a sell ladder bot."""
    # Validate bot exists and belongs to broker
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    try:
        assignment = assign_client_to_sell_ladder_bot(bot_id, request.mandate_id, db)
        
        return SellLadderBotAssignmentResponse(
            id=assignment.id,
            bot_id=assignment.bot_id,
            mandate_id=assignment.mandate_id,
            is_house_account=bool(assignment.is_house_account),
            priority_order=assignment.priority_order,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else "",
            is_active=bool(assignment.is_active)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/sell-ladder-bots/{bot_id}/assign-house", response_model=SellLadderBotAssignmentResponse)
def assign_house_to_sell_ladder_bot_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Assign house account to a sell ladder bot."""
    try:
        assignment = assign_house_to_sell_ladder_bot(bot_id, db)
        
        return SellLadderBotAssignmentResponse(
            id=assignment.id,
            bot_id=assignment.bot_id,
            mandate_id=assignment.mandate_id,
            is_house_account=bool(assignment.is_house_account),
            priority_order=assignment.priority_order,
            assigned_at=assignment.assigned_at.isoformat() if assignment.assigned_at else "",
            is_active=bool(assignment.is_active)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{broker_account_id}/sell-ladder-bots/{bot_id}/assignments", response_model=List[SellLadderBotAssignmentResponse])
def get_sell_ladder_bot_assignments_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Get all assignments for a sell ladder bot."""
    assignments = get_sell_ladder_bot_assignments(bot_id, db)
    
    return [
        SellLadderBotAssignmentResponse(
            id=a.id,
            bot_id=a.bot_id,
            mandate_id=a.mandate_id,
            is_house_account=bool(a.is_house_account),
            priority_order=a.priority_order,
            assigned_at=a.assigned_at.isoformat() if a.assigned_at else "",
            is_active=bool(a.is_active)
        )
        for a in assignments
    ]


@router.delete("/{broker_account_id}/sell-ladder-bots/{bot_id}/assignments/{assignment_id}")
def remove_sell_ladder_assignment_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    assignment_id: int = Path(..., description="Assignment ID"),
    db: Session = Depends(get_db)
):
    """Remove an assignment from a sell ladder bot."""
    # Validate bot exists and belongs to broker
    bot = get_sell_ladder_bot(bot_id, db)
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    # Validate assignment exists and belongs to bot
    from app.models import SellLadderBotAssignment
    assignment = db.query(SellLadderBotAssignment).filter(
        SellLadderBotAssignment.id == assignment_id,
        SellLadderBotAssignment.bot_id == bot_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or does not belong to this bot")
    
    try:
        remove_sell_ladder_assignment(assignment_id, db)
        return {"message": "Assignment removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{broker_account_id}/sell-ladder-bots/{bot_id}/place-orders")
def place_sell_ladder_orders_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Manually trigger order placement for a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    try:
        place_sell_ladder_orders(bot_id, db)
        return {"message": "Orders placed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{broker_account_id}/sell-ladder-bots/{bot_id}/orders")
def get_sell_ladder_bot_orders_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Get active orders for a sell ladder bot."""
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    bot_orders = db.query(SellLadderBotOrder).join(Order).filter(
        SellLadderBotOrder.bot_id == bot_id,
        Order.status.in_(["PENDING", "PARTIALLY_FILLED"])
    ).all()
    
    orders_data = []
    for bot_order in bot_orders:
        order = bot_order.order
        if order:
            orders_data.append({
                "order_id": order.id,
                "price_level": bot_order.price_level,
                "strategy_price": bot_order.strategy_price,
                "price_per_unit": order.price_per_unit,
                "quantity_units": order.quantity_units,
                "filled_quantity": order.filled_quantity,
                "remaining_quantity": order.remaining_quantity,
                "status": order.status,
                "created_at": order.created_at.isoformat() if order.created_at else ""
            })
    
    return {"orders": orders_data}


@router.get("/{broker_account_id}/sell-ladder-bots/{bot_id}/queue")
def get_sell_ladder_bot_queue_endpoint(
    broker_account_id: int = Path(..., description="Broker account ID"),
    bot_id: int = Path(..., description="Sell ladder bot ID"),
    db: Session = Depends(get_db)
):
    """Get FIFO queue status for a sell ladder bot."""
    from ..models import SellLadderFIFOCreditQueue, SellLadderBotAssignment
    from ..services.sell_ladder_bot import get_total_available_credits
    
    bot = get_sell_ladder_bot(bot_id, db)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Sell ladder bot not found")
    
    if bot.broker_account_id != broker_account_id:
        raise HTTPException(status_code=403, detail="Bot does not belong to this broker")
    
    # Get assignments
    assignments = get_sell_ladder_bot_assignments(bot_id, db)
    
    # Get queue entries
    queue_entries = db.query(SellLadderFIFOCreditQueue).filter(
        SellLadderFIFOCreditQueue.bot_id == bot_id
    ).order_by(SellLadderFIFOCreditQueue.queue_position).all()
    
    total_available = get_total_available_credits(bot_id, db)
    
    queue_data = []
    for entry in queue_entries:
        assignment = db.query(SellLadderBotAssignment).filter(
            SellLadderBotAssignment.id == entry.assignment_id
        ).first()
        
        queue_data.append({
            "id": entry.id,
            "assignment_id": entry.assignment_id,
            "scheme_id": entry.scheme_id,
            "credits_available": entry.credits_available,
            "credits_traded": entry.credits_traded,
            "queue_position": entry.queue_position,
            "is_house_account": assignment.is_house_account if assignment else False,
            "mandate_id": entry.mandate_id
        })
    
    return {
        "assignments": len(assignments),
        "queue_entries": len(queue_entries),
        "total_available_credits": total_available,
        "queue": queue_data
    }

