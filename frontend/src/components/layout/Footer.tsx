import { Link } from 'react-router-dom';
import { Github, FileText } from 'lucide-react';
import { config } from '@/lib/config';

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-sm text-muted-foreground">
          CSV Intelligence Layer - A compiler for messy CSV data
        </p>
        <div className="flex items-center gap-4">
          <a
            href={config.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
          <Link
            to="/api-docs"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            API Docs
            <FileText className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
