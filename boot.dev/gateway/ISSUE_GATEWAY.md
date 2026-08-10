# ISSUE: Unable to curl the SynergyChat Gateway

## Summary

After applying the Kubernetes Gateway API manifests in `gateway/` to a kind cluster,
`curl` against the gateway failed. The Gateway itself was healthy and programmed, but
two things were missing:

1. The application backend components (Deployments, Services, ConfigMaps for
   `synergychat-api`, `synergychat-web`, `synergychat-crawler`) had **never been
   applied** to the cluster.
2. The `web-httproute.yaml` manifest had **never been applied** either.

A secondary, pre-existing issue with the kind LoadBalancer (Envoy Gateway +
`cloud-provider-kind`) caused intermittent `Connection reset by peer` errors that made
the problem harder to diagnose.

## Environment

- Cluster: kind, 1 control-plane + 3 workers (kind v1.35.0)
- Gateway controller: Envoy Gateway v1.5.1 (`envoy-gateway-system` namespace)
- GatewayClass: `app-gatewayclass` -> `gateway.envoyproxy.io/gatewayclass-controller`
- Gateway: `app-gateway` in `default`, HTTP listener on port 80, address `172.19.0.7`
- Manifest directory: `boot.dev/` (app components) and `boot.dev/gateway/` (gateway API resources)

## Symptoms observed

| Probe | Result |
|---|---|
| `curl -H "Host: synchat.internal" http://172.19.0.7/` | HTTP 404 `route_not_found` |
| `curl -H "Host: synchatapi.internal" http://172.19.0.7/` | `Connection reset by peer` (HTTP 000) |
| `kubectl get httproute` | only `api-httproute` present, `web-httproute` missing |
| `kubectl get deploy,svc,cm -n default` | no SynergyChat app resources at all |
| `kubectl describe httproute api-httproute` | `ResolvedRefs: False, Reason: BackendNotFound, Message: service default/api-service not found.` |
| Envoy Gateway controller logs | `ERROR ... failed to get Service {"namespace":"default","name":"api-service","error":"Service \"api-service\" not found"}` |

## Root causes

### 1. Backend application was never deployed (primary cause)

Only the manifests inside `gateway/` had been applied. The manifests in `boot.dev/`
(`api-deployment.yaml`, `api-service.yaml`, `web-deployment.yaml`, `web-service.yaml`,
`crawler-*.yaml`, the ConfigMaps) were never applied. As a result:

- The Services referenced by the HTTPRoutes (`api-service`, `web-service`) did not exist.
- Envoy Gateway could not resolve the backend references, so it reported
  `BackendNotFound` on the routes.
- The route existed for `synchatapi.internal` but had no valid upstream, so Envoy
  dropped the connection instead of serving traffic -> `Connection reset by peer`.
- No route existed for `synchat.internal` at all -> HTTP 404.

### 2. `web-httproute.yaml` was never applied

Only `api-httproute.yaml` had been applied. Requests for the web hostname
(`synchat.internal`) had no matching route and returned `404 route_not_found`.

### 3. Intermittent `Connection reset by peer` to the LoadBalancer IP (contributing confusion)

The Envoy Gateway load balancer service
(`envoy-default-app-gateway-7e01cf4f` in `envoy-gateway-system`) uses
`externalTrafficPolicy: Local`. The virtual IP `172.19.0.7` is assigned by
`cloud-provider-kind` running on the host. Traffic to that IP, and the NodePort
(`30614`) on nodes that do not host the Envoy pod, are dropped or reset:

| Node | NodePort `30614` result |
|---|---|
| `172.19.0.3` (hosts Envoy pod) | HTTP 200 (works) |
| `172.19.0.4`, `172.19.0.5`, `172.19.0.6` | connection timeout |

This made direct curls to `172.19.0.7` flaky even after the config was fixed.

## Fix applied

Apply all missing application manifests and the missing route:

```bash
kubectl apply -f api-configmap.yaml -f api-deployment.yaml -f api-service.yaml \
              -f web-deployment.yaml -f web-service.yaml \
              -f crawler-configmap.yaml -f crawler-deployment.yaml -f crawler-service.yaml \
              -f gateway/web-httproute.yaml
```

## Verification

After applying:

- `kubectl get httproute -n default` -> both `api-httproute` and `web-httproute` present.
- Both routes report `ResolvedRefs: True`.
- `kubectl get endpoints api-service` -> `10.244.3.4:8080` (pods Ready).
- Envoy access logs show clean upstream routing:
  - `synchat.internal` -> `via_upstream`, upstream `10.244.3.5:8080` (web-service), HTTP 200.
  - `synchatapi.internal` -> `via_upstream`, upstream `10.244.3.4:8080` (api-service),
    HTTP 404 (the API app itself returns 404 for `/`; traffic reaches the backend).

### Reliable ways to curl the gateway

```bash
# 1. Port-forward to the Envoy load balancer (recommended)
kubectl port-forward -n envoy-gateway-system svc/envoy-default-app-gateway-7e01cf4f 18080:80
curl -H "Host: synchat.internal" http://localhost:18080/
curl -H "Host: synchatapi.internal" http://localhost:18080/

# 2. NodePort on the node that hosts the Envoy pod (externalTrafficPolicy: Local)
curl -H "Host: synchat.internal" http://172.19.0.3:30614/
```

## Lessons learned / prevention

- A Gateway config looks healthy (Gateway `Programmed`, listener `Accepted`) even when
  the backends it references do not exist. Always check the route status conditions
  (`Accepted`, `ResolvedRefs`) and the controller logs, not just the Gateway status.
- All resources referenced by routes (Services, Deployments, ConfigMaps) must be
  applied before traffic can flow.
- On kind, prefer `kubectl port-forward` or the NodePort on the correct node; the
  `cloud-provider-kind` virtual IP is unreliable when the LB service uses
  `externalTrafficPolicy: Local`.
