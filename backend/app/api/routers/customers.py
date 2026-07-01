from fastapi import APIRouter, Depends

from ...core.auth import require_permission
from ...schemas import Customer, CustomerCreate, CustomerUpdate
from ...services import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])
service = CustomerService()


@router.get("", response_model=list[Customer])
def list_customers(_=Depends(require_permission("customers:read"))):
    return service.list()


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: int, _=Depends(require_permission("customers:read"))):
    return service.get(customer_id)


@router.post("", response_model=Customer, status_code=201)
def create_customer(customer: CustomerCreate, _=Depends(require_permission("customers:create"))):
    return service.create(customer)


@router.put("/{customer_id}", response_model=Customer)
def update_customer(customer_id: int, customer: CustomerUpdate, _=Depends(require_permission("customers:update"))):
    return service.update(customer_id, customer)


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, _=Depends(require_permission("customers:delete"))):
    return service.delete(customer_id)
