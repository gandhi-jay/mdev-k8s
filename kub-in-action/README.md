

# Chapter 3

## Cluster Creation & Deployment with LoadBalancer

> `kind create cluster --config cluster. yaml`

Check with `docker ps`
Make sure you have `alias k='kubectl'` in zshrc file.

> `k create deployment scarx --image=filterkaafi/scarx:0.1`

> check with k9s or `k get deploy`, check nodes, containers inside pods. should be workign

> `k expose deployment scarx --type=LoadBalancer --port 8080`

get ip from `docker inspect kind-control-plane --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`

or `k get nodes -o wide`

## Update image

> `k set image deployment/scarx scarx=filterkaafi/scarx:0.2`

- `deployment/scarx` - Deployment Name
- `scarx=` - Container name, running inside the pod (From PodSpec)
- `filterkaafi/scarx:0.2` - Image name


## Scale

> `k scale deployment/scarx --replicas=3`

