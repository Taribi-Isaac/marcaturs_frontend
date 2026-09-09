import { useRoutes } from 'react-router-dom'
import { PublicShell } from '@/app/layout/PublicShell'
import { BusinessShell } from '@/app/layout/BusinessShell'
import { AmbassadorShell } from '@/app/layout/AmbassadorShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/marketing/HomePage'
import {
  AboutPage,
  ContactPage,
  FaqPage,
  ForAmbassadorsPage,
  ForBusinessesPage,
  HowItWorksPage,
  LegalPlaceholderPage,
} from '@/features/marketing/StaticPages'
import { DiscoverPage } from '@/features/marketplace/DiscoverPage'
import { CampaignDetailPage } from '@/features/marketplace/CampaignDetailPage'
import {
  AccountBlockedPage,
  ForbiddenPage,
  NotFoundPage,
  PlaceholderDesk,
} from '@/features/app/PlaceholderPages'
import { CampaignListPage } from '@/features/business-campaigns/CampaignListPage'
import { CampaignCreatePage } from '@/features/business-campaigns/CampaignCreatePage'
import { BusinessCampaignDetailPage } from '@/features/business-campaigns/BusinessCampaignDetailPage'
import { AmbassadorDiscoverPage } from '@/features/ambassador-deals/AmbassadorDiscoverPage'
import { DealListPage } from '@/features/ambassador-deals/DealListPage'
import { DealDetailPage } from '@/features/ambassador-deals/DealDetailPage'
import { CreateDealPage } from '@/features/ambassador-deals/CreateDealPage'
import { EarningsPage } from '@/features/ambassador-deals/EarningsPage'
import { OfficialPaymentPage } from '@/features/ambassador-deals/OfficialPaymentPage'
import { BusinessDealListPage } from '@/features/business-deals/BusinessDealListPage'
import { BusinessDealDetailPage } from '@/features/business-deals/BusinessDealDetailPage'
import { ParticipantDisputeListPage } from '@/features/participant-disputes/ParticipantDisputeListPage'
import { ParticipantDisputeDetailPage } from '@/features/participant-disputes/ParticipantDisputeDetailPage'
import { ParticipantNotificationsPage } from '@/features/participant-notifications/ParticipantNotificationsPage'
import { ParticipantMessagesPage } from '@/features/participant-messages/ParticipantMessagesPage'
import { ParticipantVerificationPage } from '@/features/participant-verification/ParticipantVerificationPage'

export function AppRouter() {
  return useRoutes([
    {
      element: <PublicShell />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/discover', element: <DiscoverPage /> },
        { path: '/campaigns/:id', element: <CampaignDetailPage /> },
        { path: '/pay/:token', element: <OfficialPaymentPage /> },
        { path: '/how-it-works', element: <HowItWorksPage /> },
        { path: '/for-businesses', element: <ForBusinessesPage /> },
        { path: '/for-ambassadors', element: <ForAmbassadorsPage /> },
        { path: '/about', element: <AboutPage /> },
        { path: '/contact', element: <ContactPage /> },
        { path: '/faq', element: <FaqPage /> },
        { path: '/terms', element: <LegalPlaceholderPage kind="terms" /> },
        { path: '/privacy', element: <LegalPlaceholderPage kind="privacy" /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/forbidden', element: <ForbiddenPage /> },
        { path: '/account-blocked', element: <AccountBlockedPage /> },
      ],
    },
    {
      element: <RequireAuth roles={['BUSINESS']} />,
      children: [
        {
          path: '/app/business',
          element: <BusinessShell />,
          children: [
            {
              index: true,
              element: (
                <PlaceholderDesk
                  title="Business dashboard"
                  description="Your operational overview will compose campaign, Deal, and commission attention items in a later task. Navigation is ready."
                />
              ),
            },
            {
              path: 'campaigns',
              element: <CampaignListPage />,
            },
            {
              path: 'campaigns/new',
              element: <CampaignCreatePage />,
            },
            {
              path: 'campaigns/:id',
              element: <BusinessCampaignDetailPage />,
            },
            {
              path: 'deals',
              element: <BusinessDealListPage />,
            },
            {
              path: 'deals/:id',
              element: <BusinessDealDetailPage />,
            },
            {
              path: 'messages',
              element: <ParticipantMessagesPage role="BUSINESS" />,
            },
            {
              path: 'messages/:conversationId',
              element: <ParticipantMessagesPage role="BUSINESS" />,
            },
            {
              path: 'commissions',
              element: (
                <PlaceholderDesk
                  title="Commissions"
                  description="Commission due/paid tracking for businesses will follow."
                />
              ),
            },
            {
              path: 'disputes',
              element: <ParticipantDisputeListPage role="BUSINESS" />,
            },
            {
              path: 'disputes/:id',
              element: <ParticipantDisputeDetailPage role="BUSINESS" />,
            },
            {
              path: 'notifications',
              element: <ParticipantNotificationsPage role="BUSINESS" />,
            },
            {
              path: 'verification',
              element: <ParticipantVerificationPage role="BUSINESS" />,
            },
            {
              path: 'settings',
              element: (
                <PlaceholderDesk
                  title="Settings"
                  description="Profile and password settings placeholder."
                />
              ),
            },
          ],
        },
      ],
    },
    {
      element: <RequireAuth roles={['AMBASSADOR']} />,
      children: [
        {
          path: '/app/ambassador',
          element: <AmbassadorShell />,
          children: [
            {
              index: true,
              element: <AmbassadorDiscoverPage />,
            },
            {
              path: 'deals',
              element: <DealListPage />,
            },
            {
              path: 'deals/new',
              element: <CreateDealPage />,
            },
            {
              path: 'deals/:id',
              element: <DealDetailPage />,
            },
            {
              path: 'earnings',
              element: <EarningsPage />,
            },
            {
              path: 'disputes',
              element: <ParticipantDisputeListPage role="AMBASSADOR" />,
            },
            {
              path: 'disputes/:id',
              element: <ParticipantDisputeDetailPage role="AMBASSADOR" />,
            },
            {
              path: 'messages',
              element: <ParticipantMessagesPage role="AMBASSADOR" />,
            },
            {
              path: 'messages/:conversationId',
              element: <ParticipantMessagesPage role="AMBASSADOR" />,
            },
            {
              path: 'verification',
              element: <ParticipantVerificationPage role="AMBASSADOR" />,
            },
            {
              path: 'notifications',
              element: <ParticipantNotificationsPage role="AMBASSADOR" />,
            },
            {
              path: 'settings',
              element: (
                <PlaceholderDesk
                  title="Settings"
                  description="Profile and password settings placeholder."
                />
              ),
            },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ])
}
