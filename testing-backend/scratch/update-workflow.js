const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Users/kartikadhonde/n8n-local/testing-backend/n8n-workflow.json', 'utf8'));

// 1. Find the Webhook node
const webhookNode = data.nodes.find(n => n.name === 'Webhook');

// 2. Create the Smart Router node (IF node or Switch node)
const routerNode = {
  "parameters": {
    "jsCode": "const url = $input.first().json.body?.repoUrl || $input.first().json.repoUrl || $input.first().json.url;\nif (!url) throw new Error('No URL provided');\nif (url.includes('github.com') || url.includes('gitlab.com')) {\n  return [[{ json: { repoUrl: url } }], []];\n} else {\n  return [[], [{ json: { repoUrl: url } }]];\n}"
  },
  "id": "smart-router-node",
  "name": "Smart Router",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [310, 300]
};

// 3. Create the Playwright Test node
const playwrightNode = {
  "parameters": {
    "jsCode": "const { execSync } = require('child_process');\nconst fs = require('fs');\nconst url = $input.first().json.repoUrl;\n\ntry {\n  // Run playwright app.js\n  const cmd = `cd /home/pwuser/playwright-app && npm install && node app.js ${url}`;\n  execSync(cmd, { encoding: 'utf-8', timeout: 120000 });\n  \n  // Read the generated report.json\n  const reportRaw = fs.readFileSync('/home/pwuser/playwright-app/reports/report.json', 'utf8');\n  const report = JSON.parse(reportRaw);\n  \n  return [{ json: { isPlaywright: true, report } }];\n} catch (error) {\n  return [{ json: { isPlaywright: true, error: error.message } }];\n}"
  },
  "id": "playwright-test-node",
  "name": "Playwright Test",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [520, 500]
};

// 4. Update Respond to Webhook to handle both payloads
const respondNode = data.nodes.find(n => n.name === 'Respond to Webhook');
// Already configured to output $json, so it should be fine.

// Add new nodes
data.nodes.push(routerNode);
data.nodes.push(playwrightNode);

// Update connections
// Webhook originally went to "Clone/Pull Code" (id 5f606da0-d29b-4f9e-99cb-db8b8a5d3f21)
// We need to change Webhook to go to "Smart Router"
if (data.connections) {
  const webhookConns = data.connections["Webhook"];
  if (webhookConns) {
    // Delete old connections
    delete data.connections["Webhook"];
  }
  
  // Wire Webhook -> Smart Router
  data.connections["Webhook"] = {
    "main": [
      [
        {
          "node": "Smart Router",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };

  // Wire Smart Router
  // Output 0 -> Clone/Pull Code
  // Output 1 -> Playwright Test
  data.connections["Smart Router"] = {
    "main": [
      [
        {
          "node": "Clone/Pull Code",
          "type": "main",
          "index": 0
        }
      ],
      [
        {
          "node": "Playwright Test",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };

  // Wire Playwright Test -> Respond to Webhook
  data.connections["Playwright Test"] = {
    "main": [
      [
        {
          "node": "Respond to Webhook",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };
}

fs.writeFileSync('/Users/kartikadhonde/n8n-local/testing-backend/n8n-workflow.json', JSON.stringify(data, null, 2));
console.log('Successfully updated workflow JSON');
