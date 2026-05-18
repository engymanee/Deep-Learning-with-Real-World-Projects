'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { OrnamentalRule } from '@/components/ui/ornamental-rule'

export default function StyleGuidePage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-display text-[var(--color-navy)]">WaW Design System</h1>
          <p className="text-lg text-[var(--color-navy-muted)] font-cardo">
            Visual foundation for the Wisdom at Work Learning Portal
          </p>
        </div>

        <OrnamentalRule />

        {/* Colors */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 1 · COLORS
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Brand Palette</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'Navy', value: '#274d80', var: '--color-navy' },
              { name: 'Paper', value: '#fefefe', var: '--color-paper' },
              { name: 'Parchment', value: '#faf7f2', var: '--color-parchment' },
              { name: 'Ink', value: '#1a2f4f', var: '--color-ink' },
              { name: 'Navy Muted', value: '#6b86ad', var: '--color-navy-muted' },
              { name: 'Navy Tint', value: '#e8eef5', var: '--color-navy-tint' },
              { name: 'Crimson', value: '#bb4658', var: '--color-crimson' },
              { name: 'Crimson Soft', value: '#f4e2e4', var: '--color-crimson-soft' },
              { name: 'Success', value: '#4a7c59', var: '--color-success' },
            ].map((color) => (
              <Card key={color.var} className="p-4">
                <div
                  className="w-full h-24 rounded-md mb-3 border border-[var(--border-default)]"
                  style={{ backgroundColor: color.value }}
                />
                <p className="font-semibold text-sm text-[var(--color-ink)]">{color.name}</p>
                <p className="text-xs text-[var(--color-navy-muted)] font-mono">{color.value}</p>
              </Card>
            ))}
          </div>
        </section>

        <OrnamentalRule />

        {/* Typography */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 2 · TYPOGRAPHY
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Font Families & Scales</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-alegreya text-3xl">Display — Alegreya SC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[var(--color-navy-muted)]">
                <p>Used for: Hero titles, program/year openers, brand wordmark, module unit openings</p>
                <p>Size: 28–40px | Weight: 500 | Tracking: +0.03em</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-eyebrow">EYEBROW LABEL — ALEGREYA SC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[var(--color-navy-muted)]">
                <p>Used for: Small-caps labels above titles, section tags</p>
                <p>Size: 11–12px | Weight: 500 | Tracking: +0.12em | Color: Crimson or Navy-muted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-vollkorn text-2xl">Section Heading — Vollkorn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[var(--color-navy-muted)]">
                <p>Used for: Page titles, major section headers (H1/H2)</p>
                <p>Size: 22–28px | Weight: 600 | Line-height: tight</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-vollkorn text-lg">Card Title — Vollkorn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[var(--color-navy-muted)]">
                <p>Used for: Lesson card titles, sidebar headers, dashboard widget titles (H3/H4)</p>
                <p>Size: 16–18px | Weight: 500</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="font-cardo text-base">Body Long-Form — Cardo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-body-long">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <p className="text-sm text-[var(--color-navy-muted)]">Size: 17px | Weight: 400 | Line-height: 1.7 | Use for lesson content, discussion posts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-micro font-inter">UI MICRO — INTER</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[var(--color-navy-muted)]">
                <p>Used for: Timestamps, breadcrumbs, button labels under 14px, badges, tooltips</p>
                <p>Size: 12–13px | Weight: 400 | Font: Inter (sans-serif)</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <OrnamentalRule />

        {/* Buttons */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 3 · BUTTONS
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Button Variants</h2>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-card-title">Primary Button</CardTitle>
                <CardDescription>Navy filled. Sentence case. One per screen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-card-title">Secondary Button</CardTitle>
                <CardDescription>Navy outline. For supporting actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="secondary" size="sm">
                    Small
                  </Button>
                  <Button variant="secondary" size="lg">
                    Large
                  </Button>
                  <Button variant="secondary" disabled>
                    Disabled
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-card-title">Ghost Button</CardTitle>
                <CardDescription>Transparent. For tertiary actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="ghost" size="sm">
                    Small
                  </Button>
                  <Button variant="ghost" size="lg">
                    Large
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-card-title">Accent Button</CardTitle>
                <CardDescription>Crimson, pill-shaped. For moments of genuine emphasis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button variant="accent">Join Discussion</Button>
                  <Button variant="accent">Submit Reflection</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <OrnamentalRule />

        {/* Badges */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 4 · BADGES
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Badge Variants</h2>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Quiet (Default)</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="quiet">Default Badge</Badge>
                  <Badge variant="quiet">Another Badge</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Active / Live</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="active">Active Badge</Badge>
                  <Badge variant="active">Current</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--color-navy)]">Functional</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="success">Complete</Badge>
                  <Badge variant="warning">At Risk</Badge>
                  <Badge variant="error">Error</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <OrnamentalRule />

        {/* Cards */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 5 · CARDS
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Card Component</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>This is how cards look in the design system.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body-ui">
                Cards sit on parchment with a 1px subtle navy border, 12px radius, and 24px padding. They have a hover state that increases border opacity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Another Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body-ui">Cards are the primary content container throughout the portal.</p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">
                  Action
                </Button>
                <Button variant="secondary" size="sm">
                  Alternative
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <OrnamentalRule />

        {/* Decorative Elements */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 6 · DECORATIVE ELEMENTS
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Ornamental Vocabulary</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Eyebrow Labels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Eyebrow color="navy-muted">MODULE 01 · LESSON 03</Eyebrow>
              <Eyebrow color="crimson">IMPORTANT NOTE · HIGHLIGHT THIS</Eyebrow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ornamental Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrnamentalRule />
              <OrnamentalRule variant="diamond" />
            </CardContent>
          </Card>
        </section>

        <OrnamentalRule />

        {/* Spacing & Radius */}
        <section className="space-y-6">
          <div>
            <Eyebrow color="crimson" className="mb-2">
              SECTION 7 · SPACING & RADIUS
            </Eyebrow>
            <h2 className="text-section-heading text-[var(--color-navy)]">Layout System</h2>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-[var(--color-navy)] mb-3">Spacing Scale (4px base)</p>
                <div className="space-y-2">
                  <p className="text-micro">• 4px (--space-1) | 8px (--space-2) | 12px (--space-3) | 16px (--space-4)</p>
                  <p className="text-micro">• 24px (--space-5) | 32px (--space-6) | 48px (--space-7) | 64px (--space-8)</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--color-navy)] mb-3">Border Radius</p>
                <div className="space-y-2">
                  <p className="text-micro">• 4px (--radius-sm) | 8px (--radius-md) | 12px (--radius-lg) | 16px (--radius-xl)</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--color-navy)] mb-3">Max Content Width</p>
                <p className="text-micro">• Reading surfaces (lesson body): 680px maximum width (hard rule)</p>
                <p className="text-micro">• Dashboard and library: 1200px container width</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-[var(--border-subtle)]">
          <p className="text-micro text-[var(--color-navy-muted)]">
            WaW Design System v1.0 — Build with calm, cool, and collected intention.
          </p>
        </div>
      </div>
    </main>
  )
}
