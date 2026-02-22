# Publishing vacuum-sdk to npm

## Fix "Access token expired or revoked"

Log in again and complete the browser auth:

```bash
npm login
```

Follow the link, sign in on npmjs.com, then return to the terminal.

---

## Fix 404 "Not found" for @vacuum/sdk

Scoped packages like `@vacuum/sdk` require an **npm organization** named `vacuum`. If that org doesn’t exist (or you’re not a member), npm returns 404.

**Option A – Use the unscoped name (current setup)**  
The package is named `vacuum-sdk` so you can publish under your user without creating an org:

```bash
cd packages/sdk
npm run build
npm publish
```

Install after publishing:

```bash
npm install vacuum-sdk ethers
```

**Option B – Keep @vacuum/sdk**  
1. Create the org: https://www.npmjs.com/org/create → create **vacuum**.  
2. In `package.json` set `"name": "@vacuum/sdk"`.  
3. Publish with public access:

   ```bash
   npm publish --access public
   ```

---

## Publish steps (unscoped `vacuum-sdk`)

1. **Log in** (if needed):
   ```bash
   npm login
   ```

2. **Bump version** (optional):
   ```bash
   npm version patch   # 1.0.1 → 1.0.2
   ```

3. **Build and publish**:
   ```bash
   cd packages/sdk
   npm run build
   npm publish
   ```

4. **Dry run** (see what would be uploaded):
   ```bash
   npm publish --dry-run
   ```
