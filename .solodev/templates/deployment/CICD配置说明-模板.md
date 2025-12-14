# CI/CD配置说明

> **项目**: [项目名称]
> **版本**: [版本号]
> **迭代**: Iteration X
> **日期**: YYYY-MM-DD

---

## 一、CI/CD概述

### 1.1 CI/CD目标

- **持续集成（CI）**：代码提交后自动运行测试，确保代码质量
- **持续部署（CD）**：测试通过后自动部署到目标环境

### 1.2 CI/CD平台

本项目使用：**[GitHub Actions / GitLab CI / Jenkins]**

### 1.3 CI/CD流程图

```
代码提交（Git Push）
  ↓
触发CI/CD Pipeline
  ↓
阶段1: 代码检查（Lint）
  ├─ ESLint
  ├─ Prettier检查
  └─ TypeScript类型检查
  ↓ (通过)
阶段2: 单元测试
  ├─ 运行单元测试
  └─ 生成覆盖率报告
  ↓ (通过)
阶段3: 构建（Build）
  ├─ npm run build
  └─ Docker镜像构建
  ↓ (成功)
阶段4: 集成测试
  ├─ E2E测试
  ├─ 性能测试
  └─ 混沌测试
  ↓ (通过)
阶段5: 部署
  ├─ 部署到测试环境（自动）
  └─ 部署到生产环境（需审批）
  ↓
阶段6: 部署后验证
  ├─ 健康检查
  ├─ 冒烟测试
  └─ 监控检查
  ↓
完成并通知
```

---

## 二、GitHub Actions配置

### 2.1 工作流文件结构

```
.github/workflows/
  ├── ci.yml              # 持续集成（测试 + 构建）
  ├── deploy-test.yml     # 部署到测试环境
  └── deploy-prod.yml     # 部署到生产环境
```

---

### 2.2 CI工作流配置

**文件路径**：`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  # ============================================
  # 阶段1: 代码检查
  # ============================================
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier check
        run: npm run format:check

      - name: TypeScript type check
        run: npm run type-check

  # ============================================
  # 阶段2: 单元测试
  # ============================================
  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  # ============================================
  # 阶段3: 构建
  # ============================================
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  # ============================================
  # 阶段4: E2E测试
  # ============================================
  e2e:
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:6
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Run database migrations
        run: npm run migrate:test
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
```

**关键配置说明**：

| 配置项              | 说明                                       |
| ------------------- | ------------------------------------------ |
| `on.push.branches`  | 触发条件：推送到main或develop分支         |
| `on.pull_request`   | 触发条件：创建PR到main分支                 |
| `needs`             | 任务依赖关系，确保按顺序执行               |
| `services`          | 定义测试所需的服务（PostgreSQL, Redis）   |
| `actions/cache`     | 缓存npm依赖，加速构建                      |

---

### 2.3 部署到测试环境

**文件路径**：`.github/workflows/deploy-test.yml`

```yaml
name: Deploy to Test Environment

on:
  push:
    branches: [ develop ]
  workflow_dispatch:  # 允许手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: test
      url: https://test.example.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Deploy to test server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.TEST_SERVER_HOST }}
          username: ${{ secrets.TEST_SERVER_USER }}
          key: ${{ secrets.TEST_SERVER_SSH_KEY }}
          script: |
            cd /var/www/[project-name]
            git pull origin develop
            npm ci --production
            npm run build
            pm2 restart [app-name]

      - name: Wait for service to be ready
        run: sleep 30

      - name: Run smoke tests
        run: |
          curl -f https://test.example.com/health || exit 1
          npm run test:smoke:remote
        env:
          TEST_URL: https://test.example.com

      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Test environment deployment: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Secrets配置**（在GitHub仓库Settings → Secrets中配置）：
- `TEST_SERVER_HOST`：测试服务器地址
- `TEST_SERVER_USER`：SSH用户名
- `TEST_SERVER_SSH_KEY`：SSH私钥
- `SLACK_WEBHOOK`：Slack通知webhook

---

### 2.4 部署到生产环境

**文件路径**：`.github/workflows/deploy-prod.yml`

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'  # 当创建tag如v1.0.0时触发
  workflow_dispatch:  # 允许手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Create deployment package
        run: |
          tar -czf deploy.tar.gz dist/ package.json package-lock.json ecosystem.config.js

      - name: Backup production database
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            docker exec prod-postgres pg_dump -U ${DB_USER} ${DB_NAME} | \
              gzip > /var/backups/database/backup_$(date +%Y%m%d_%H%M%S).sql.gz

      - name: Deploy to production
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          source: deploy.tar.gz
          target: /tmp/

      - name: Extract and restart service
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            cd /var/www/[project-name]
            tar -xzf /tmp/deploy.tar.gz
            npm run migrate:prod
            pm2 reload [app-name]  # 平滑重启
            rm /tmp/deploy.tar.gz

      - name: Wait for service to be ready
        run: sleep 30

      - name: Health check
        run: |
          curl -f https://example.com/health || exit 1

      - name: Run smoke tests
        run: npm run test:smoke:remote
        env:
          TEST_URL: https://example.com

      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        if: success()
        with:
          status: success
          text: '✅ Production deployment successful: ${{ github.ref_name }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Rollback on failure
        if: failure()
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            cd /var/www/[project-name]
            git checkout HEAD~1
            npm ci --production
            npm run build
            pm2 restart [app-name]

      - name: Notify deployment failure
        uses: 8398a7/action-slack@v3
        if: failure()
        with:
          status: failure
          text: '❌ Production deployment failed and rolled back'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**生产部署触发方式**：
```bash
# 创建并推送tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 三、GitLab CI配置

### 3.1 工作流文件

**文件路径**：`.gitlab-ci.yml`

```yaml
stages:
  - lint
  - test
  - build
  - deploy-test
  - deploy-prod

# ============================================
# 全局变量
# ============================================
variables:
  NODE_VERSION: "18"
  POSTGRES_DB: testdb
  POSTGRES_USER: testuser
  POSTGRES_PASSWORD: testpass

# ============================================
# 阶段1: 代码检查
# ============================================
lint:
  stage: lint
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run lint
    - npm run format:check
    - npm run type-check

# ============================================
# 阶段2: 单元测试
# ============================================
test:unit:
  stage: test
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test:unit
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# ============================================
# 阶段3: 构建
# ============================================
build:
  stage: build
  image: node:18
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

# ============================================
# 阶段4: E2E测试
# ============================================
test:e2e:
  stage: test
  image: node:18
  services:
    - postgres:14
    - redis:6
  variables:
    DATABASE_URL: "postgresql://testuser:testpass@postgres:5432/testdb"
    REDIS_URL: "redis://redis:6379"
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run migrate:test
    - npm run test:e2e
  dependencies:
    - build

# ============================================
# 阶段5: 部署到测试环境
# ============================================
deploy:test:
  stage: deploy-test
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$TEST_SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan $TEST_SERVER_HOST >> ~/.ssh/known_hosts
  script:
    - |
      ssh $TEST_SERVER_USER@$TEST_SERVER_HOST << 'EOF'
        cd /var/www/[project-name]
        git pull origin develop
        npm ci --production
        npm run build
        pm2 restart [app-name]
      EOF
  only:
    - develop
  environment:
    name: test
    url: https://test.example.com

# ============================================
# 阶段6: 部署到生产环境
# ============================================
deploy:prod:
  stage: deploy-prod
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client curl
    - eval $(ssh-agent -s)
    - echo "$PROD_SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - ssh-keyscan $PROD_SERVER_HOST >> ~/.ssh/known_hosts
  script:
    # 备份数据库
    - |
      ssh $PROD_SERVER_USER@$PROD_SERVER_HOST << 'EOF'
        docker exec prod-postgres pg_dump -U ${DB_USER} ${DB_NAME} | \
          gzip > /var/backups/database/backup_$(date +%Y%m%d_%H%M%S).sql.gz
      EOF
    # 部署
    - |
      ssh $PROD_SERVER_USER@$PROD_SERVER_HOST << 'EOF'
        cd /var/www/[project-name]
        git fetch --tags
        git checkout $CI_COMMIT_TAG
        npm ci --production
        npm run build
        npm run migrate:prod
        pm2 reload [app-name]
      EOF
    # 健康检查
    - sleep 30
    - curl -f https://example.com/health || exit 1
  only:
    - tags
  when: manual  # 需要手动触发
  environment:
    name: production
    url: https://example.com
```

**GitLab CI Variables配置**（Settings → CI/CD → Variables）：
- `TEST_SERVER_HOST`
- `TEST_SERVER_USER`
- `TEST_SSH_PRIVATE_KEY`
- `PROD_SERVER_HOST`
- `PROD_SERVER_USER`
- `PROD_SSH_PRIVATE_KEY`

---

## 四、Docker镜像构建与发布

### 4.1 多阶段构建Dockerfile

**文件路径**：`Dockerfile`

```dockerfile
# ============================================
# 阶段1: 构建
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --production=false

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# ============================================
# 阶段2: 生产镜像
# ============================================
FROM node:18-alpine

WORKDIR /app

# 复制生产依赖
COPY package*.json ./
RUN npm ci --production

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

---

### 4.2 Docker镜像CI/CD

**GitHub Actions示例**：

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: [username]/[project-name]
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=[username]/[project-name]:buildcache
          cache-to: type=registry,ref=[username]/[project-name]:buildcache,mode=max
```

---

## 五、部署策略

### 5.1 蓝绿部署（GitHub Actions）

```yaml
deploy:
  steps:
    # ... 前置步骤 ...

    - name: Deploy to green environment
      run: |
        ssh user@server << 'EOF'
          # 部署到绿环境（端口3001）
          cd /var/www/app-green
          git pull
          npm ci && npm run build
          pm2 start --name app-green
        EOF

    - name: Switch traffic to green
      run: |
        ssh user@server << 'EOF'
          # 修改Nginx配置切换流量
          sudo sed -i 's/localhost:3000/localhost:3001/' /etc/nginx/sites-available/app
          sudo nginx -t && sudo systemctl reload nginx
        EOF

    - name: Stop blue environment
      if: success()
      run: |
        ssh user@server "pm2 stop app-blue"
```

---

### 5.2 金丝雀发布（Canary Deployment）

```yaml
deploy:
  strategy:
    canary:
      increments: [10, 25, 50, 100]
  steps:
    - name: Deploy canary
      run: |
        # 部署到10%流量
        kubectl set image deployment/app app=[image]:${{ github.sha }}
        kubectl rollout status deployment/app

    - name: Monitor metrics
      run: |
        # 监控错误率
        ./scripts/check-metrics.sh

    - name: Promote or rollback
      run: |
        if [ $METRICS_OK ]; then
          # 继续部署到更多流量
          kubectl scale deployment/app-canary --replicas=5
        else
          # 回滚
          kubectl rollout undo deployment/app
        fi
```

---

## 六、监控与通知

### 6.1 Slack通知

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,commit,author
    text: |
      Deployment to ${{ github.event.deployment.environment }}
      Status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  if: always()
```

### 6.2 Email通知

```yaml
- name: Send email notification
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: 'Deployment ${{ job.status }}: ${{ github.repository }}'
    body: |
      Deployment to ${{ github.event.deployment.environment }} ${{ job.status }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
    to: team@example.com
  if: always()
```

---

## 七、安全最佳实践

### 7.1 Secrets管理

- [ ] 不在代码中硬编码密钥
- [ ] 使用平台提供的Secrets管理
- [ ] 定期轮换密钥
- [ ] 最小权限原则（SSH密钥仅用于部署）

### 7.2 镜像扫描

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: [username]/[project-name]:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## 八、故障排查

### 8.1 CI/CD失败常见原因

| 失败阶段     | 可能原因                       | 解决方案                       |
| ------------ | ------------------------------ | ------------------------------ |
| Lint         | 代码格式不符合规范             | 本地运行 `npm run lint:fix`    |
| Test         | 测试失败                       | 本地运行测试，修复失败用例     |
| Build        | 构建错误（TypeScript类型错误） | 修复类型错误                   |
| Deploy       | SSH连接失败                    | 检查SSH密钥配置                |
| Deploy       | 服务启动失败                   | 检查日志，修复配置错误         |

### 8.2 查看CI/CD日志

**GitHub Actions**：
- 在仓库的 Actions 标签页查看工作流运行记录
- 点击具体任务查看详细日志

**GitLab CI**：
- 在项目的 CI/CD → Pipelines 查看
- 点击具体job查看日志

---

## 九、CI/CD优化

### 9.1 加速构建

**缓存依赖**：
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

**并行执行任务**：
```yaml
jobs:
  lint:
    ...
  test:
    ...
  # lint和test并行执行（没有needs依赖）
```

**使用更小的镜像**：
```dockerfile
FROM node:18-alpine  # 而不是 node:18
```

---

### 9.2 成本优化

- 使用自托管Runner（避免公共Runner费用）
- 限制工作流触发频率（避免PR每次commit都触发）
- 清理旧的工作流运行记录和artifacts

---

## 十、参考资料

**CI/CD平台文档**：
- GitHub Actions: https://docs.github.com/en/actions
- GitLab CI: https://docs.gitlab.com/ee/ci/
- Jenkins: https://www.jenkins.io/doc/

**相关文档**：
- 部署手册.md - 手动部署流程
- 运维手册.md - 运维操作
