Terraform module: ecs-service. Parameterized so every service's environment/
root module can instantiate it with just a service name + size, rather than
duplicating resource definitions per service.
