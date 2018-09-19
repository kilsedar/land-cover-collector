# Land Cover Collector
The application Land Cover Collector is developed to collect data on land cover classification using the nomenclature of [GlobeLand30](http://www.globallandcover.com/GLC30Download/index.aspx). It is published as Android and iOS mobile applications and it is available on [Web](https://landcover.como.polimi.it/collector/).

Points of interest added by everyone:
![everyonePois](screenshots/everyonePois.png)

## Configuration
It mainly uses PouchDB, CouchDB, Cordova and Leaflet.

CouchDB version is 2.1.1. Installation instructions using the Apache CouchDB convenience binary packages for Unix-like systems can be found [here](http://docs.couchdb.org/en/2.1.1/install/unix.html).

Cordova version is 8.0.0. Installation instructions can be found [here](https://cordova.apache.org/docs/en/latest/guide/cli/).

The plugins used in this application are already in the repository.

It is necessary to point the application to your CouchDB instance in the "www/settings.js" file that you need to create.

## Credits
The application uses [EmoMap](https://github.com/cartogroup/emomap). The developer acknowledges its contributions to the development.

This work is supported by [URBAN GEOmatics for Bulk Information Generation, Data Assessment and Technology Awareness (URBAN GEO BIG DATA)](http://www.urbangeobigdata.it/), a [Project of National Interest (PRIN)](http://prin.miur.it/) funded by the [Italian Ministry of Education, University and Research (MIUR)](http://www.miur.gov.it/web/guest/home) - id. 20159CNLW8.
