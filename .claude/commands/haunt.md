Launch HAUNT — the haunted mansion dashboard for your Ghost databases.

Steps:

1. Check if the Ghost MCP bridge server is running on port 3001 by hitting `http://localhost:3001/api/ghost/list`
2. If it's not running, start it: `cd server && npx tsx bridge.ts &`
3. Wait for the bridge to be ready (retry the health check)
4. Start the Next.js dev server: `npm run dev -- --port 3002`
5. Tell the user HAUNT is running at http://localhost:3002
