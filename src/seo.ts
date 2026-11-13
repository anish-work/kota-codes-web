import type { Page } from './App';
import { GALLERY, MEETUP_01, SITE, SPEAKERS } from './content';

// JSON-LD structured data, injected into each page's <head> at prerender time.
// Every page names the organisation; /meetup-01 also describes the event, which keeps it in Google's event results.
export function structuredData(page: Page) {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE.url}/#org`,
    name: SITE.name,
    description: SITE.tagline,
    url: SITE.url,
    logo: `${SITE.url}/favicon.svg`,
    sameAs: [SITE.instagram],
    areaServed: { '@type': 'City', name: MEETUP_01.city },
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: { '@id': `${SITE.url}/#org` },
    inLanguage: 'en-IN',
  };

  const event = {
    '@type': 'Event',
    name: MEETUP_01.name,
    description: MEETUP_01.description,
    startDate: MEETUP_01.start,
    endDate: MEETUP_01.end,
    eventStatus: 'https://schema.org/EventScheduled', // it went ahead as planned; schema.org has no "completed" status
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    inLanguage: 'en-IN',
    image: [`${SITE.url}${GALLERY[0].full}`, `${SITE.url}/og-image.png`], // the group photo, then the share image
    url: `${SITE.url}/meetup-01`,
    location: {
      '@type': 'Place',
      name: MEETUP_01.venue,
      hasMap: MEETUP_01.mapsUrl,
      address: { '@type': 'PostalAddress', addressLocality: MEETUP_01.city, addressRegion: MEETUP_01.region, addressCountry: 'IN' },
    },
    organizer: { '@id': `${SITE.url}/#org` },
    performer: SPEAKERS.map((s) => ({
      '@type': 'Person',
      name: s.name,
      jobTitle: s.role,
      worksFor: { '@type': 'Organization', name: s.org },
    })),
  };

  const graph = page === 'home' ? [organization, website] : page === 'meetup' ? [organization, event] : [organization];
  return { '@context': 'https://schema.org', '@graph': graph };
}
