import { EVENT, FAQ, SITE, SPEAKERS } from './content';

// JSON-LD structured data, injected into <head> at prerender time.
// Event + FAQPage make the page eligible for Google's event and FAQ rich results.
export function structuredData() {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE.url}/#org`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
    sameAs: [SITE.instagram],
  };

  const event = {
    '@type': 'Event',
    name: EVENT.name,
    description: EVENT.description,
    startDate: EVENT.start,
    endDate: EVENT.end,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    inLanguage: 'en-IN',
    image: [`${SITE.url}/og-image.png`],
    url: SITE.url,
    location: {
      '@type': 'Place',
      name: EVENT.venue ?? `${EVENT.city}, ${EVENT.region} (venue to be announced)`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: EVENT.city,
        addressRegion: EVENT.region,
        addressCountry: 'IN',
      },
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}/#register-form`,
    },
    organizer: { '@id': `${SITE.url}/#org` },
    performer: SPEAKERS.map((s) => ({
      '@type': 'Person',
      name: s.name,
      jobTitle: s.role,
      worksFor: { '@type': 'Organization', name: s.org },
    })),
  };

  const faq = {
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return { '@context': 'https://schema.org', '@graph': [organization, event, faq] };
}
