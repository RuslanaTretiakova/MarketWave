import { BottomCTA } from '@/components/marketing/bottom-cta'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { LandingHero } from '@/components/marketing/landing-hero'
import { LandingRoles } from '@/components/marketing/landing-roles'
import { LandingWorkflowStrip } from '@/components/marketing/landing-workflow-strip'
import { WorkflowSpotlight } from '@/components/marketing/workflow-spotlight'

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
