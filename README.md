
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Building for Firebase Hosting (Default)

To build the application for Firebase Hosting (its primary configuration):

```bash
npm run build
```

This will generate a standard Next.js production build in the `.next` directory. Firebase Hosting is typically configured to serve this output.

## Building and Deploying to Cloudflare Pages

This project can also be built and deployed to [Cloudflare Pages](https://pages.cloudflare.com/). Cloudflare Pages uses Cloudflare Workers for dynamic Next.js features.

### Prerequisites

1.  **Install Wrangler CLI**:
    If you don't have it already, install the Cloudflare Wrangler CLI:
    ```bash
    npm install -g wrangler
    ```

2.  **Login to Cloudflare**:
    ```bash
    wrangler login
    ```

### Build for Cloudflare

To build the application specifically for Cloudflare Pages:

```bash
npm run build:cloudflare
```

This command uses `@cloudflare/next-on-pages` to output a build in the `.vercel/output` directory (containing `static` and `functions` subdirectories) that is compatible with the Cloudflare Pages environment.

### Deploy to Cloudflare Pages

You can deploy to Cloudflare Pages using a few methods:

**1. Direct Upload with Wrangler (for testing or manual deploys):**

After running `npm run build:cloudflare`, you can deploy the static assets part of the output directly:

```bash
wrangler pages deploy .vercel/output/static --project-name <your-cloudflare-project-name>
```
(Note: For full Next.js functionality including server components and API routes on Cloudflare, Git integration or a more complex Wrangler configuration involving the `functions` directory is typically needed. The command above is primarily for static assets.)

Make sure to replace `<your-cloudflare-project-name>` with the name of your project on Cloudflare Pages. If the project doesn't exist, Wrangler might offer to create it.

**2. Git Integration (Recommended for continuous deployment):**

*   Push your code to a GitHub, GitLab, or Bitbucket repository.
*   In your Cloudflare dashboard, create a new Pages project.
*   Connect it to your Git repository.
*   **Build Configuration in Cloudflare Pages UI**:
    *   **Framework preset**: Select **Next.js**.
    *   **Build command**: `npm run build:cloudflare`
    *   **Build output directory**: Typically, with the Next.js preset, Cloudflare Pages will correctly identify the build output. You can usually leave this as the default, or set it to `/` (project root). The `@cloudflare/next-on-pages` tool generates its output in `.vercel/output` at your project root, and the Next.js preset understands this structure.
    *   **Root directory**: Leave blank or set to `/` (this is the root of your repository where `package.json` is located).
    *   **Environment Variables**:
        *   **Recommended**: Set `NODE_VERSION` to `18` or `20` (e.g., `NODE_VERSION = 20`).
        *   **Optional (if Firebase config is externalized)**: If you later move Firebase client-side config to environment variables, add them here (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.). For the current setup, these are not strictly required as the config is embedded.

### Important Notes for Cloudflare Deployment:

*   **Firebase Services**: Your application's frontend will continue to interact with your Firebase backend (Firestore, Auth) as configured in `src/lib/firebase/firebase.ts`. Ensure your Firebase project's security rules allow access from your Cloudflare Pages domain if necessary (though typically not an issue for client-side SDK usage).
*   **Edge Runtime Compatibility**: Server Components, Server Actions, and API Routes in your Next.js application will run on Cloudflare's Edge Workers. Ensure any server-side code is compatible with the Edge runtime (e.g., avoid Node.js-specific APIs not available in Workers unless you configure Node.js compatibility for your Pages project).
*   The primary configuration of this app remains Firebase-centric. This Cloudflare setup provides an alternative deployment target for the Next.js frontend.
```