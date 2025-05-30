export default async function () {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [
    {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: "test-app",
      },
      spec: {
        selector: {
          app: "test-app",
        },
        ports: [
          {
            port: 80,
            targetPort: 80,
          },
        ],
      },
    },
  ];
}
