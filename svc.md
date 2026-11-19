The clusterIP is the IP address that the service is bound to on the internal Kubernetes network. Remember how we talked about how pods get their own internal, virtual IP address? Well, services can too! However, type: ClusterIP is just one type of service! There are several others, including:

NodePort: Exposes the Service on each Node's IP at a static port.

LoadBalancer: Creates an external load balancer in the current cloud environment (if supported, e.g. AWS, GCP, Azure) and assigns a fixed, external IP to the service.

ExternalName: Maps the Service to the contents of the externalName field (for example, to the hostname api.foo.bar.example). The mapping configures your cluster's DNS server to return a CNAME record with that external hostname value. No proxying of any kind is set up.

Service types kind of build on top of each other:

NodePort service is just a ClusterIP service with the added functionality of exposing the service on each node's IP at a static port (it still has an internal cluster IP).

A LoadBalancer service is just a NodePort service with the added functionality of creating an external load balancer in the current cloud environment (it still has an internal cluster IP and node port).

...and an ExternalName service is actually a bit different. All it does is a DNS-level redirect. You can use it to redirect traffic from one service to another.