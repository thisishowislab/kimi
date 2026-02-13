// Manual retrigger - call this after publishing in Contentful
// Or set up a simple cron job to run every 5 minutes

const { execSync } = require('child_process');

module.exports = async (req, res) => {
  // Simple secret check
  const secret = req.query.secret;
  if (secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  try {
    // Rebuild data files
    execSync('node api/build-data.js', { 
      env: { ...process.env },
      stdio: 'inherit'
    });
    
    res.json({ revalidated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
