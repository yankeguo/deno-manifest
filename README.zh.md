# deno-manifest

一个 GitOps 工具，可将目录中所有 TypeScript 默认导出聚合为 Kubernetes 资源列表（JSON 格式），用于简化 GitOps 工作流程。

> [!WARNING]
>
> 由于 `deno` 动态导入的限制，本项目使用子进程来执行 `.ts` 文件。

## 功能特性

- 🔄 **自动发现**：递归查找项目中的所有 `.ts` 和 `.mts` 文件
- 📦 **智能聚合**：将默认导出组合成单个 Kubernetes List 资源
- 🚀 **函数支持**：自动调用导出的函数以生成动态资源
- 🎯 **GitOps 就绪**：输出有效的 JSON 格式 Kubernetes 清单，可直接用于 GitOps 工作流程
- 🛡️ **安全过滤**：自动排除测试文件、类型定义文件和隐藏文件

## 为什么选择 TypeScript？

与其他清单生成方法（如 Jsonnet、Kustomize 或普通 YAML 模板）相比，我们基于 TypeScript 的解决方案具有显著优势：

### 🎯 **官方 Kubernetes 类型的类型安全**

- 利用官方 Kubernetes NPM 包（如 `@kubernetes/client-node`）获得完整的类型定义
- 获得资源模式的编译时验证
- 在部署前捕获配置错误，而非运行时

### 💡 **卓越的开发体验**

- **IDE 智能提示**：为所有 Kubernetes 资源字段提供完整的 IntelliSense 支持和自动补全
- **即时反馈**：输入时即可看到错误 - 拼写错误的字段、错误的类型或无效配置会立即高亮显示
- **文档触手可及**：悬停在任何字段上即可查看官方 Kubernetes API 的文档

### 🔧 **强大的语言特性**

- 使用 TypeScript 的全部功能：条件语句、循环、函数和模块
- 跨清单导入和重用通用配置
- 利用 npm 生态系统中的实用工具库
- 为清单生成逻辑编写单元测试

### 📝 **示例：类型安全实战**

使用 TypeScript 和 Kubernetes 类型：

```typescript
import { V1Deployment } from "@kubernetes/client-node";

// TypeScript 立即捕获错误！
const deployment: V1Deployment = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: "my-app",
    // TypeScript 错误：'lables' 不存在。您是否想输入 'labels'？
    lables: { app: "my-app" },
  },
  spec: {
    // TypeScript 错误：不能将类型 'string' 分配给类型 'number'
    replicas: "3",
    selector: {
      matchLabels: { app: "my-app" },
    },
    template: {
      // 所有嵌套字段的完整自动补全！
      metadata: { labels: { app: "my-app" } },
      spec: {
        containers: [
          {
            name: "app",
            image: "my-app:latest",
            // TypeScript 知道这应该是一个对象数组
            ports: [{ containerPort: 8080 }],
          },
        ],
      },
    },
  },
};
```

相比之下，Jsonnet 或普通 YAML：

- ❌ 对拼写错误或错误的字段名没有即时反馈
- ❌ 没有值的类型检查（字符串 vs 数字 vs 对象）
- ❌ 没有自动补全或 IntelliSense
- ❌ 错误只有在部署时才会被发现

## 安装

```bash
# 直接从源代码安装
deno install -A --name deno-manifest https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# 或者无需安装直接运行
deno run -A https://raw.githubusercontent.com/yankeguo/deno-manifest/main/main.ts

# 或使用我的短链接
deno run -A https://gyk.me/r/deno-manifest.ts
```

## 使用方法

### 基本用法

导航到包含 TypeScript 文件的目录并运行：

```bash
# 输出 JSON 到标准输出
deno-manifest

# 保存 JSON 输出到文件
deno-manifest > manifests.json

# 如需要转换为 YAML（需要 yq）
deno-manifest | yq eval -P > manifests.yaml
```

### 示例项目结构

```
my-app/
├── deployment.ts
├── service.ts
├── configmap.ts
├── components/
│   ├── redis.ts
│   └── postgres.ts
└── _test.ts          # 被忽略（以 _ 开头）
```

### TypeScript 文件示例

**deployment.ts**：

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

**service.ts**：

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

**configmap.ts**（动态生成）：

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

**components/redis.ts**（多个资源）：

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

### 生成的输出

在上述结构上运行 `deno-manifest` 会产生：

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

## 使用场景

### 1. GitOps 工作流程

```bash
# 生成清单并应用到集群（JSON 格式）
deno-manifest | kubectl apply -f -

# 保存 JSON 到文件用于 GitOps 仓库
deno-manifest > k8s-manifests.json
git add k8s-manifests.json
git commit -m "feat: update kubernetes manifests"

# 如果您的 GitOps 工作流程偏好 YAML，可转换为 YAML
deno-manifest | yq eval -P > k8s-manifests.yaml
```

### 2. 特定环境配置

为不同环境创建不同的目录：

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
# 为特定环境生成清单
cd environments/production
deno-manifest > ../../manifests/production.json
```

### 3. 动态资源生成

使用 TypeScript 的强大功能进行动态配置：

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
      // ... 部署规格的其余部分
    },
  };
}
```

## 文件模式

### 包含的文件

- `*.ts` - TypeScript 文件
- `*.mts` - TypeScript 模块文件

### 排除的文件

- 以 `.` 或 `_` 开头的文件（隐藏/私有文件）
- `*.d.ts`、`*.d.mts` - TypeScript 类型定义文件
- `*_test.ts`、`*_test.mts` - 测试文件
- 位于以 `.`、`_` 或 `node_modules` 开头的目录中的文件

## 导出类型

### 对象导出

```typescript
export default {
  /* Kubernetes 资源 */
};
```

### 函数导出（运行时执行）

```typescript
export default function () {
  return {
    /* Kubernetes 资源 */
  };
}
```

### 数组导出（项目会被展开到列表中）

```typescript
export default [
  {
    /* 资源 1 */
  },
  {
    /* 资源 2 */
  },
];
```

## 致谢

GUO YANKE，MIT 许可证
