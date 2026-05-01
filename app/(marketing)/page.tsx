import { BottomCTA } from '@/components/layout/bottom-cta'
import { FeaturesGrid } from '@/components/layout/features-grid'
import { HowItWorks } from '@/components/layout/how-it-works'
import { LandingHero } from '@/components/layout/landing-hero'
import { LandingRoles } from '@/components/layout/landing-roles'
import { LandingWorkflowStrip } from '@/components/layout/landing-workflow-strip'
import { WorkflowSpotlight } from '@/components/layout/workflow-spotlight'

export default function MarketingHomePage() {
  return (
    <>
      <LandingHero />
      <LandingWorkflowStrip />
      <FeaturesGrid />
      <WorkflowSpotlight />
      <LandingRoles />
      <HowItWorks />
      <BottomCTA />
    </>
  )
}
