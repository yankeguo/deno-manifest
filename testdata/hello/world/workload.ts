export default {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "test-app",
  },
  spec: {
    replicas: 1,
  },
};
