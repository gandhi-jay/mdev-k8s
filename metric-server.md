# [metrics-server](https://github.com/kubernetes-sigs/metrics-server)

Install by: kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

```bash
 because it doesn't contain any IP SANs" node="kind-worker2"
E1117 12:47:36.527231       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.2:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.2 because it doesn't contain any IP SANs" node="kind-worker"
E1117 12:47:36.531807       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.5:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.5 because it doesn't contain any IP SANs" node="kind-worker4"
I1117 12:47:41.212864       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
I1117 12:47:41.273056       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
I1117 12:47:51.264545       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
E1117 12:47:51.501270       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.3:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.3 because it doesn't contain any IP SANs" node="kind-control-plane"
E1117 12:47:51.502359       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.6:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.6 because it doesn't contain any IP SANs" node="kind-worker2"
E1117 12:47:51.516145       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.2:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.2 because it doesn't contain any IP SANs" node="kind-worker"
E1117 12:47:51.521686       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.4:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.4 because it doesn't contain any IP SANs" node="kind-worker3"
E1117 12:47:51.523922       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.5:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.5 because it doesn't contain any IP SANs" node="kind-worker4"
I1117 12:48:01.273297       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
E1117 12:48:06.504659       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.2:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.2 because it doesn't contain any IP SANs" node="kind-worker"
E1117 12:48:06.511639       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.3:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.3 because it doesn't contain any IP SANs" node="kind-control-plane"
E1117 12:48:06.513052       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.4:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.4 because it doesn't contain any IP SANs" node="kind-worker3"
E1117 12:48:06.537331       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.6:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.6 because it doesn't contain any IP SANs" node="kind-worker2"
E1117 12:48:06.537729       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.5:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.5 because it doesn't contain any IP SANs" node="kind-worker4"
I1117 12:48:11.273742       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
I1117 12:48:21.265074       1 server.go:192] "Failed probe" probe="metric-storage-ready" err="no metrics to serve"
E1117 12:48:21.506715       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.6:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.6 because it doesn't contain any IP SANs" node="kind-worker2"
E1117 12:48:21.520358       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.3:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.3 because it doesn't contain any IP SANs" node="kind-control-plane"
E1117 12:48:21.520748       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.4:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.4 because it doesn't contain any IP SANs" node="kind-worker3"
E1117 12:48:21.527063       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.5:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.5 because it doesn't contain any IP SANs" node="kind-worker4"
E1117 12:48:21.539057       1 scraper.go:149] "Failed to scrape node" err="Get \"https://172.19.0.2:10250/metrics/resource\": tls: failed to verify certificate: x509: cannot validate certificate for 172.19.0.2 because it doesn't contain any IP SANs" node="kind-worker"
```

This is a **TLS certificate validation failure between Metrics Server and your KIND nodes**.

Metrics Server is trying to scrape each kubelet at `https://<node-ip>:10250/metrics/resource`. However, the kubelet's serving certificate does not contain the node's IP address in its **Subject Alternative Names (SANs)**.

For example:

```
cannot validate certificate for 172.19.0.2
because it doesn't contain any IP SANs
```

Because certificate verification fails, Metrics Server cannot collect node metrics. The `metric-storage-ready: no metrics to serve` messages are a downstream consequence, not a separate problem.

### **Fix for a local KIND cluster**

The quickest fix is to tell Metrics Server to skip verification of kubelet serving certificates.

Edit the deployment:

```
kubectl -n kube-system edit deployment metrics-server
```

Find the `args` section under the `metrics-server` container and append:

```
- --kubelet-insecure-tls
```

For example:

```
containers:
  - name: metrics-server
    args:
      - --cert-dir=/tmp
      - --secure-port=10250
      - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
      - --kubelet-use-node-status-port
      - --metric-resolution=15s
      - --kubelet-insecure-tls  # Add this
```

Save and exit.

### **Verify the fix**

Wait for the deployment to restart:

```
kubectl -n kube-system rollout status deployment/metrics-server
```

Check whether metrics are available:

```
kubectl top nodes
kubectl top pods -A
```

You can also inspect the API service:

```
kubectl get apiservice v1beta1.metrics.k8s.io
```

### **Why does this happen?**

The connection looks like this:

![alt text](image.png)

**Metrics Server**

Collects CPU and memory metrics

HTTPS :10250 — certificate validation fails

**Kubelet (KIND nodes)**

Serves /metrics/resource

Metrics Server connects using node IP addresses, but the kubelet certificates don't contain matching IP SANs.

There are two approaches:

| Approach                    | Explanation                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `--kubelet-insecure-tls`    | Skip certificate verification                                |
| Proper serving certificates | Issue certificates with correct SANs, signed by a trusted CA |

The first approach is convenient for local KIND development. **Don't use it in production**, because it disables TLS certificate verification between Metrics Server and kubelets. The Metrics Server project explicitly recommends proper certificate validation for secure deployments.&#x20;



**My recommendation:** For your local KIND cluster, use `--kubelet-insecure-tls`. It should resolve the errors across all your worker and control-plane nodes.