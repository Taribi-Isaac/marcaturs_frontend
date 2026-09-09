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

export function AppRouter() {
  return useRoutes([
    {
      element: <PublicShell />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/discover', element: <DiscoverPage /> },
        { path: '/campaigns/:id', element: <CampaignDetailPage /> },
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
              element: (
                <PlaceholderDesk
                  title="Deals"
                  description="Business Deal investigation and confirmation UX will land after foundation."
                />
              ),
            },
            {
              path: 'messages',
              element: (
                <PlaceholderDesk
                  title="Messages"
                  description="Business ↔ Ambassador chat comes later."
                />
              ),
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
              element: (
                <PlaceholderDesk
                  title="Disputes"
                  description="Participant dispute desk placeholder."
                />
              ),
            },
            {
              path: 'verification',
              element: (
                <PlaceholderDesk
                  title="Verification"
                  description="Business verification submissions will be implemented next."
                />
              ),
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
              element: (
                <PlaceholderDesk
                  title="Discover"
                  description="Browse the public marketplace to find campaigns. Full in-app discovery filters arrive with the marketplace slice — open Discover for live opportunities."
                />
              ),
            },
            {
              path: 'deals',
              element: (
                <PlaceholderDesk
                  title="Deals"
                  description="Ambassador Deal creation and tracking will be implemented in a later vertical slice."
                />
              ),
            },
            {
              path: 'earnings',
              element: (
                <PlaceholderDesk
                  title="Earnings"
                  description="Commission due/paid/received views will land with the commission slice."
                />
              ),
            },
            {
              path: 'messages',
              element: (
                <PlaceholderDesk title="Messages" description="Chat with businesses comes later." />
              ),
            },
            {
              path: 'verification',
              element: (
                <PlaceholderDesk
                  title="Verification"
                  description="Ambassador verification placeholder."
                />
              ),
            },
            {
              path: 'notifications',
              element: <PlaceholderDesk title="Notifications" description="Inbox placeholder." />,
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
