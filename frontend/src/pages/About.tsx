import { Github, ExternalLink, Mail, FileSpreadsheet } from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { config } from '@/lib/config';

const techStack = [
  { name: 'React 18', category: 'Frontend' },
  { name: 'TypeScript', category: 'Language' },
  { name: 'Vite', category: 'Build' },
  { name: 'TailwindCSS', category: 'Styling' },
  { name: 'shadcn/ui', category: 'Components' },
  { name: 'React Query', category: 'Data Fetching' },
  { name: 'Zustand', category: 'State' },
  { name: 'Monaco Editor', category: 'Editor' },
  { name: 'Fastify', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Redis', category: 'Queue' },
  { name: 'BullMQ', category: 'Workers' },
  { name: 'Drizzle ORM', category: 'ORM' },
  { name: 'Zod', category: 'Validation' },
];

export function AboutPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="About"
        description="Learn more about CSV Intelligence Layer"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              The Project
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray dark:prose-invert">
            <p>
              CSV Intelligence Layer is an open-source data transformation pipeline
              designed to bring order to messy CSV data.
            </p>
            <p>
              Born from the frustration of dealing with inconsistent data exports,
              varying column names, and mixed data types, this tool provides a
              deterministic, explainable way to normalize data.
            </p>
            <h4>Key Design Decisions</h4>
            <ul>
              <li>
                <strong>No guessing:</strong> When something is ambiguous, we ask
                rather than assume.
              </li>
              <li>
                <strong>Full audit trail:</strong> Every transformation is logged
                and traceable.
              </li>
              <li>
                <strong>API-first:</strong> The web UI is just one way to interact
                with the system.
              </li>
              <li>
                <strong>Local-first:</strong> Your data never leaves your infrastructure.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>
              Built with modern, production-ready technologies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <Badge key={tech.name} variant="secondary">
                  {tech.name}
                </Badge>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h4 className="font-semibold">Architecture</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Frontend:</strong> React SPA with React Query for data
                  fetching and Zustand for local state.
                </p>
                <p>
                  <strong>Backend:</strong> Fastify API server with BullMQ workers
                  for async processing.
                </p>
                <p>
                  <strong>Data:</strong> PostgreSQL for persistence, Redis for
                  job queues.
                </p>
                <p>
                  <strong>Pipeline:</strong> 5-stage worker architecture with
                  automatic retries and human-in-the-loop support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Get Involved</CardTitle>
            <CardDescription>
              CSV Intelligence Layer is open source and welcomes contributions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <a
                href={config.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <Github className="h-8 w-8" />
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">View source code</p>
                </div>
              </a>

              <a
                href={config.githubIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-8 w-8" />
                <div>
                  <p className="font-medium">Issues</p>
                  <p className="text-sm text-muted-foreground">Report bugs or ideas</p>
                </div>
              </a>

              <a
                href={`mailto:${config.contactEmail}`}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <Mail className="h-8 w-8" />
                <div>
                  <p className="font-medium">Contact</p>
                  <p className="text-sm text-muted-foreground">Get in touch</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>License</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              CSV Intelligence Layer is released under the MIT License.
              You are free to use, modify, and distribute this software
              for any purpose, commercial or non-commercial.
            </p>
            <pre className="mt-4 p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
