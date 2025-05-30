# deno-manifest

A GitOps tool that aggregates all default TypeScript exports from a directory into a Kubernetes resource list (JSON format) for streamlined GitOps workflows.

> [!WARNING]
>
> Due to the limitation of `deno`'s dynamic import, this project uses child process to evaluate `.ts` files.

## Features

- 🔄 **Automatic Discovery**: Recursively finds all `.ts` and `.mts` files in your project
- 📦 **Smart Aggregation**: Combines default exports into a single Kubernetes List resource
- 🚀 **Function Support**: Automatically calls exported functions to generate dynamic resources
- 🎯 **GitOps Ready**: Outputs valid Kubernetes manifests in JSON format for direct use in GitOps workflows
- 🛡️ **Safe Filtering**: Excludes test files, definition files, and hidden files automatically

## Installation

```bash
# Install directly from source
deno install -A --name deno-manifest https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# Or run directly without installation
deno run -A https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# Or use my short link
deno run -A https://gyk.me/r/deno-manifest.ts
```

## Usage

### Basic Usage

Navigate to your directory containing TypeScript files and run:

```bash
# Output JSON to stdout
deno-manifest

# Save JSON output to file
deno-manifest > manifests.json

# Convert to YAML if needed (requires yq)
deno-manifest | yq eval -P > manifests.yaml
```

### Example Project Structure

```
my-app/
├── deployment.ts
├── service.ts
├── configmap.ts
├── components/
│   ├── redis.ts
│   └── postgres.ts
└── _test.ts          # Ignored (starts with _)
```

### Example TypeScript Files

**deployment.ts**:

```typescript
export default {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "my-app",
    namespace: "default",
  },
  spec: {
    replicas: 3,
    selector: {
      matchLabels: { app: "my-app" },
    },
    template: {
      metadata: {
        labels: { app: "my-app" },
      },
      spec: {
        containers: [
          {
            name: "app",
            image: "my-app:latest",
            ports: [{ containerPort: 8080 }],
          },
        ],
      },
    },
  },
};
```

**service.ts**:

```typescript
export default {
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    name: "my-app-service",
    namespace: "default",
  },
  spec: {
    selector: { app: "my-app" },
    ports: [
      {
        port: 80,
        targetPort: 8080,
      },
    ],
    type: "ClusterIP",
  },
};
```

**configmap.ts** (Dynamic generation):

```typescript
export default function () {
  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: "my-app-config",
      namespace: "default",
    },
    data: {
      "config.yaml": `
env: ${Deno.env.get("NODE_ENV") || "development"}
timestamp: ${new Date().toISOString()}
      `.trim(),
    },
  };
}
```

**components/redis.ts** (Multiple resources):

```typescript
const namespace = "default";

export default [
  {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: "redis",
      namespace,
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: "redis" } },
      template: {
        metadata: { labels: { app: "redis" } },
        spec: {
          containers: [
            {
              name: "redis",
              image: "redis:7-alpine",
              ports: [{ containerPort: 6379 }],
            },
          ],
        },
      },
    },
  },
  {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: "redis",
      namespace,
    },
    spec: {
      selector: { app: "redis" },
      ports: [{ port: 6379, targetPort: 6379 }],
    },
  },
];
```

### Generated Output

Running `deno-manifest` on the above structure produces:

```json
{
  "apiVersion": "v1",
  "kind": "List",
  "items": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "name": "my-app",
        "namespace": "default"
      },
      "spec": {
        "replicas": 3,
        "selector": {
          "matchLabels": { "app": "my-app" }
        },
        "template": {
          "metadata": {
            "labels": { "app": "my-app" }
          },
          "spec": {
            "containers": [
              {
                "name": "app",
                "image": "my-app:latest",
                "ports": [{ "containerPort": 8080 }]
              }
            ]
          }
        }
      }
    },
    {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
        "name": "my-app-service",
        "namespace": "default"
      },
      "spec": {
        "selector": { "app": "my-app" },
        "ports": [
          {
            "port": 80,
            "targetPort": 8080
          }
        ],
        "type": "ClusterIP"
      }
    },
    {
      "apiVersion": "v1",
      "kind": "ConfigMap",
      "metadata": {
        "name": "my-app-config",
        "namespace": "default"
      },
      "data": {
        "config.yaml": "env: development\ntimestamp: 2024-01-15T10:30:00.000Z"
      }
    },
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
        "name": "redis",
        "namespace": "default"
      },
      "spec": {
        "replicas": 1,
        "selector": { "matchLabels": { "app": "redis" } },
        "template": {
          "metadata": { "labels": { "app": "redis" } },
          "spec": {
            "containers": [
              {
                "name": "redis",
                "image": "redis:7-alpine",
                "ports": [{ "containerPort": 6379 }]
              }
            ]
          }
        }
      }
    },
    {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
        "name": "redis",
        "namespace": "default"
      },
      "spec": {
        "selector": { "app": "redis" },
        "ports": [{ "port": 6379, "targetPort": 6379 }]
      }
    }
  ]
}
```

## Use Cases

### 1. GitOps Workflows

```bash
# Generate manifests and apply to cluster (JSON format)
deno-manifest | kubectl apply -f -

# Save JSON to file for GitOps repository
deno-manifest > k8s-manifests.json
git add k8s-manifests.json
git commit -m "feat: update kubernetes manifests"

# Convert to YAML if your GitOps workflow prefers YAML
deno-manifest | yq eval -P > k8s-manifests.yaml
```

### 2. Environment-Specific Configurations

Create different directories for different environments:

```
environments/
├── development/
│   ├── deployment.ts
│   └── service.ts
├── staging/
│   ├── deployment.ts
│   └── service.ts
└── production/
    ├── deployment.ts
    └── service.ts
```

```bash
# Generate manifests for specific environment
cd environments/production
deno-manifest > ../../manifests/production.json
```

### 3. Dynamic Resource Generation

Use TypeScript's power for dynamic configurations:

```typescript
// scaling.ts
export default function () {
  const replicas = Deno.env.get("REPLICAS") || "3";
  const environment = Deno.env.get("ENVIRONMENT") || "development";

  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: `app-${environment}`,
      labels: {
        environment,
        "managed-by": "deno-manifest",
      },
    },
    spec: {
      replicas: parseInt(replicas),
      // ... rest of deployment spec
    },
  };
}
```

## File Patterns

### Included Files

- `*.ts` - TypeScript files
- `*.mts` - TypeScript module files

### Excluded Files

- Files starting with `.` or `_` (hidden/private files)
- `*.d.ts`, `*.d.mts` - TypeScript definition files
- `*_test.ts`, `*_test.mts` - Test files
- Files in directories starting with `.`, `_`, or `node_modules`

## Export Types

### Object Export

```typescript
export default {
  /* Kubernetes resource */
};
```

### Function Export (Evaluated at runtime)

```typescript
export default function () {
  return {
    /* Kubernetes resource */
  };
}
```

### Array Export (Items are spread into the list)

```typescript
export default [
  {
    /* Resource 1 */
  },
  {
    /* Resource 2 */
  },
];
```

## Credits

GUO YANKE, MIT License
