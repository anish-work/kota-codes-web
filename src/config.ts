// Registration settings. Edit these, then rebuild and redeploy.
export const CONFIG = {
  // Google Apps Script web app URL (Deploy > Manage deployments > Web app URL, ends in /exec).
  // While empty, the form shows an error instead of sending.
  webAppUrl: 'https://script.google.com/macros/s/AKfycby2XhhUtQxSwkx-8vPEtnl2N4JJ-enncAJ_TFInHUXNSF7mmfsvQx4pjKed-iE-O8NZ/exec',

  // WhatsApp community invite link (chat.whatsapp.com/…), shown after every signup attempt, even a failed one.
  // While empty, no join button shows. Keep in sync with "WhatsApp group link" in the Sheet's Settings tab.
  whatsappCommunityUrl: 'https://chat.whatsapp.com/CCxRJn22gbCK6CZIX3UQPB',

  // Leave name empty until the venue is announced; the page then says "venue to be announced".
  // mapsUrl is the share link from Google Maps; every "Get directions" button opens it.
  // coordinates ([latitude, longitude]) turn on the map in the venue section. Keep in sync with the Sheet's Settings tab.
  venue: {
    name: 'iStart Nest',
    address: 'Kota',
    mapsUrl: 'https://maps.app.goo.gl/NSXd63qb7DHGtfF77',
    coordinates: null as [number, number] | null,
  },

  whatToBring: 'Your phone. A laptop and charger if you have one.',
};
