# Participant analytics (MH-AN-001, reviewed in MH-AN-002)

Google Analytics 4 for the participant site only. Admin Control does not load this tag. There is no Google Tag Manager container.

The existing stream is the only one this code will use:

- Measurement ID: `G-X3V7CW4V7V`
- Stream ID: `16236569890`
- Site: `https://app.marcaturshub.com.ng`

Do not create another property, stream, or container. Do not put the measurement ID in a committed env file. Local and test builds leave `VITE_GA_MEASUREMENT_ID` unset, so they do not send hits.

## When the tag loads

All of the following must be true:

1. The build is a production build (`import.meta.env.PROD`).
2. `VITE_GA_MEASUREMENT_ID` matches `G-` plus letters and digits. A GTM container id is rejected.
3. `VITE_PUBLIC_ORIGIN` is the https origin of the page hostname. `localhost` never qualifies.
4. The visitor has chosen Allow. The choice is stored in `localStorage` under `mh-analytics-consent@<hostname>`.

Until the GitHub production variable is set, the banner stays hidden and no tag is injected. The privacy page keeps its 14 September 2026 effective date. The two analytics paragraphs replace the approved policy’s placeholders that said optional analytics would be described when introduced.

A blocked or failed analytics script does not stop the application. No `user_id` is set. Automatic page views are turned off (`send_page_view: false`) so the router sends exactly one `page_view` per history entry.

## Page views

`AnalyticsRouteTracker` listens to React Router. The first load, an in-app navigation, and back/forward each have a location key. The same key does not send twice.

The hit uses the pathname, not `window.location.href`. Query strings and hashes are dropped. `/pay/:token` is sent as `/pay`. Public campaign ids stay in the path. Ids and other non-route segments under `/app/` are removed, and the static route is kept. Phone-length numbers, emails, and credentials in a path or title are omitted. The referrer keeps only its origin and sanitized path.

## Events

| Event | When | Parameters |
| --- | --- | --- |
| `page_view` | One history entry after consent | `page_path`, `page_location`, `page_title`, `page_referrer` |
| `sign_up_start` | Registration form passed client validation and the request is about to be sent | `account_role` (`BUSINESS` or `AMBASSADOR`) |
| `sign_up` | `register()` resolved | `method=email`, `account_role` |
| `login` | `login()` resolved | `method=email` |
| `view_campaign` | Public campaign detail query succeeded, once per campaign until another campaign is viewed | `campaign_id` |
| `start_deal` | `createDeal()` resolved | `campaign_id` |
| `create_campaign` | `createCampaign()` resolved | `campaign_id` |

`login` and `sign_up` are GA4 recommended names. `view_campaign` is custom. The recommended `view_item` name was not used, because GA4 treats it as an ecommerce product view and this app does not send a product name or a price. No production hits have been sent under `view_item`, so there is no historical report to migrate. `sign_up_start`, `start_deal`, and `create_campaign` are custom because no recommended event matches those actions without implying a checkout or a payment. `start_deal` is not a completed sale.

A repeated query for the same campaign does not send a second `view_campaign`. Opening a different campaign, then returning, sends again.

The consent value is stored as `mh-analytics-consent@<hostname>`. A choice on `localhost` is not read on `app.marcaturshub.com.ng`. Withdrawing consent sends a GA4 consent update of `analytics_storage: denied` and clears `_ga` cookies this site can see.

Page paths sent to GA4 are the sanitized path only. Public campaign ids may appear. Ids under `/app/` are removed. `/pay/<token>` is sent as `/pay`. Query strings are never sent.

Failed requests do not emit the completion event. Names, emails, phone numbers, passwords, payment amounts, evidence, and account ids are not parameters. The allow-list drops anything else.

## Consent

The banner is shown only when the tag is actually configured. Allow loads the tag. Don't allow stores a denial and does not load it. The privacy page can change the choice later. Denial also clears `_ga` cookies this site can see.

The gtag queue stores each command as an `arguments` object. The Google tag ignores a plain array, so the script can load and still send no hit.

Production collection starts only when `VITE_GA_MEASUREMENT_ID` is set on the participant production environment and a build that includes it is deployed. The tag still waits for Allow.
