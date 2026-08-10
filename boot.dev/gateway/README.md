You configured Kubernetes Gateway API resources to expose SynergyChat services externally:

- Installed the Envoy Gateway controller.
- Created a GatewayClass to declare which controller manages gateways.
- Created an HTTP Gateway listening on port 80.
- Created HTTPRoute resources that route requests by hostname:
    - web hostname → web-service
    - API hostname → api-service
- Used kubectl proxy so the CLI could inspect the Kubernetes API.

In short: the Gateway acts like a traffic director at the cluster’s edge, sending incoming HTTP requests to the appropriate internal Service.

The YAML files define Kubernetes resources:

- app-gatewayclass.yaml: selects Envoy Gateway as the controller that manages Gateways.
- app-gateway.yaml: creates the public HTTP entry point, listening on port 80.
- web-httproute.yaml: sends requests for the web hostname to web-service.
- api-httproute.yaml: sends requests for the API hostname to api-service.
- The other files from earlier lessons define the actual application pieces:

*-deployment.yaml: runs pods for each app component.
*-service.yaml: gives pods a stable internal network address.
*-configmap.yaml: stores non-secret configuration values.
Together, the Gateway and routes expose selected Services to traffic coming from outside the cluster.