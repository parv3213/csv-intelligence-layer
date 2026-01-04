// Centralized configuration from environment variables

export const config = {
  // API
  apiBase: import.meta.env.VITE_API_BASE || '',

  // GitHub
  githubRepoUrl: import.meta.env.VITE_GITHUB_REPO_URL || 'https://github.com',
  githubIssuesUrl: import.meta.env.VITE_GITHUB_ISSUES_URL || 'https://github.com/issues',

  // Contact
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || 'hello@example.com',

  // Project
  projectVersion: import.meta.env.VITE_PROJECT_VERSION || '1.0.0',
} as const;
