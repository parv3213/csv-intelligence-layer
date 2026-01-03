import { Link } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, Eye, Zap, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageWrapper } from '@/components/layout/PageWrapper';

const features = [
  {
    icon: <FileSpreadsheet className="h-6 w-6" />,
    title: 'Schema-Driven',
    description:
      'Define your target schema once, then normalize any CSV to match it. Aliases, validators, and type coercion built-in.',
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: 'Full Visibility',
    description:
      'See exactly what changed and why. Every transformation is logged and explainable. No black boxes.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Deterministic',
    description:
      'Same input, same output, every time. No AI hallucinations—just reliable, predictable transformations.',
  },
  {
    icon: <Code className="h-6 w-6" />,
    title: 'API-First',
    description:
      'Full REST API for automation. Integrate with your existing data pipelines. Webhook support coming soon.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Define Schema',
    description: 'Choose a template or create your target schema with column types and validators.',
  },
  {
    number: '2',
    title: 'Upload CSV',
    description: 'Drop your messy CSV file. We auto-detect delimiters and column types.',
  },
  {
    number: '3',
    title: 'Review & Map',
    description: 'See how columns are mapped. Override ambiguous matches if needed.',
  },
  {
    number: '4',
    title: 'Download Clean Data',
    description: 'Get your normalized, validated CSV ready for downstream use.',
  },
];

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container text-center">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm mb-6">
            <span className="font-mono">v1.0</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span>Open Source</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            A compiler for your{' '}
            <span className="text-primary">CSV chaos</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            Deterministic, explainable data transformation.
            <br />
            Know exactly what changed and why.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link to="/playground">
              <Button size="lg" className="gap-2">
                Try the Playground
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="lg">
                Read the Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <PageWrapper>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Why CSV Intelligence?</h2>
            <p className="mt-2 text-muted-foreground">
              Built for developers who need reliable data normalization
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageWrapper>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <PageWrapper>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-2 text-muted-foreground">
              Four simple steps to clean data
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%_-_1rem)] w-8">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </PageWrapper>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold">Ready to tame your CSV chaos?</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Start transforming messy data into clean, validated output in minutes.
          </p>
          <Link to="/playground">
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 gap-2"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
