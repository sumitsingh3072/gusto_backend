Dev environment root module. Wires together the modules in
`infra/terraform/modules/*` with dev-sized instance classes (single-AZ RDS,
no read replicas, single ECS task per service).
