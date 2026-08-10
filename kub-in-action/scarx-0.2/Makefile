-include Makefile.overrides
-include ../../env

PREFIX ?= filterkaafi/
IMAGE ?= scarx:0.2
FULL_IMAGE_TAG = "$(PREFIX)$(IMAGE)"

all: push

image:
	@echo "Building image $(FULL_IMAGE_TAG)"
	docker build -t $(FULL_IMAGE_TAG) ./

push: image
	docker push $(FULL_IMAGE_TAG)

kind-load: image
	kind load docker-image $(FULL_IMAGE_TAG)

run: kind-load
	kubectl delete po scarx --force ; ../../scripts/apply.sh ../pod.scarx.yaml && kubectl wait --timeout=30s --for=condition=Ready pod/scarx && kubectl port-forward scarx 8080
