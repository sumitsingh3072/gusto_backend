# notification-service

Owns the `notification` schema (`notification_log`). Outbound push/SMS/email
via SNS, and the inbound webhook for the user's Approve/Swap/Skip decision
and biometric/PIN confirmation.

Publishes: NotificationSent
Consumes: MenuProposed, OrderPlaced, OrderDelivered
Calls: orchestrator-service (forwarding decisions)
