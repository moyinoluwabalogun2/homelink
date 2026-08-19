from enum import StrEnum
from typing import TypeVar


class UserRole(StrEnum):
    USER = "user"
    AGENT = "agent"
    ADMIN = "admin"


class AccountStatus(StrEnum):
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"


class AgentType(StrEnum):
    AGENT = "agent"
    LANDLORD = "landlord"


class AgentApplicationStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VerificationDocumentType(StrEnum):
    NATIONAL_ID = "national_id"
    CAC = "cac"
    PROOF_OF_ADDRESS = "proof_of_address"
    PROPERTY_OWNERSHIP = "property_ownership"
    OTHER = "other"


class VerificationDocumentStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ListingType(StrEnum):
    RENTAL = "rental"
    BUY_PROPERTY = "buy_property"
    MARKETPLACE = "marketplace"


class ListingStatus(StrEnum):
    DRAFT = "draft"
    PENDING = "pending"
    PUBLISHED = "published"
    REJECTED = "rejected"
    EXPIRED = "expired"
    SOLD = "sold"
    RENTED = "rented"
    ARCHIVED = "archived"


class MediaType(StrEnum):
    IMAGE = "image"
    VIDEO = "video"


class RentalCategory(StrEnum):
    HOSTEL = "hostel"
    SINGLE_ROOM = "single_room"
    SELF_CONTAIN = "self_contain"
    SHARED_APARTMENT = "shared_apartment"
    MINI_FLAT = "mini_flat"
    FLAT = "flat"
    DUPLEX = "duplex"


class RentPeriod(StrEnum):
    MONTHLY = "monthly"
    SIX_MONTHS = "six_months"
    YEARLY = "yearly"


class PropertyCategory(StrEnum):
    LAND = "land"
    HOUSE = "house"
    DUPLEX = "duplex"
    COMMERCIAL = "commercial"
    OFFICE = "office"
    WAREHOUSE = "warehouse"


class PropertyCondition(StrEnum):
    NEW = "new"
    GOOD = "good"
    RENOVATION_REQUIRED = "renovation_required"


class MarketplaceCategory(StrEnum):
    PHONES = "phones"
    LAPTOPS = "laptops"
    FURNITURE = "furniture"
    ELECTRONICS = "electronics"
    APPLIANCES = "appliances"
    FASHION = "fashion"
    BOOKS = "books"
    GADGETS = "gadgets"
    SERVICES = "services"
    OTHERS = "others"


class ItemCondition(StrEnum):
    NEW = "new"
    LIKE_NEW = "like_new"
    USED = "used"
    FAIR = "fair"


class InquiryType(StrEnum):
    GENERAL = "general"
    INSPECTION = "inspection"


class InquiryStatus(StrEnum):
    OPEN = "open"
    RESPONDED = "responded"
    CLOSED = "closed"


class ReportReason(StrEnum):
    FRAUD = "fraud"
    MISLEADING = "misleading"
    DUPLICATE = "duplicate"
    UNAVAILABLE = "unavailable"
    INAPPROPRIATE = "inappropriate"
    OTHER = "other"


class ReportStatus(StrEnum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class NotificationType(StrEnum):
    SYSTEM = "system"
    SECURITY = "security"
    AGENT_APPROVED = "agent_approved"
    AGENT_REJECTED = "agent_rejected"
    LISTING_APPROVED = "listing_approved"
    LISTING_REJECTED = "listing_rejected"
    NEW_INQUIRY = "new_inquiry"
    REPORT_RESOLVED = "report_resolved"
    PAYMENT_SUCCESS = "payment_success"


class CreditType(StrEnum):
    MARKETPLACE = "marketplace"
    RENTAL = "rental"
    BUY_PROPERTY = "buy_property"


class CreditSource(StrEnum):
    FREE = "free"
    PAID = "paid"
    ADMIN = "admin"


class PaymentProvider(StrEnum):
    MOCK = "mock"
    PAYSTACK = "paystack"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    ABANDONED = "abandoned"
    REFUNDED = "refunded"


EnumType = TypeVar("EnumType", bound=StrEnum)


def enum_values(enum_class: type[EnumType]) -> list[str]:
    return [member.value for member in enum_class]