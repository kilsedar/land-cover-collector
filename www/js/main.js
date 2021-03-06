var photoNorth = "", photoEast = "", photoSouth = "", photoWest = "", photoNorthThumbnail = "", photoEastThumbnail = "", photoSouthThumbnail = "", photoWestThumbnail = "", directionNorth = "-", directionEast = "-", directionSouth = "-", directionWest = "-";

function afterLangInit() {
  var map, bing, osm, markersMy, markersAll, marker;

  var networkState, uuid, localDB, remoteUsersDB, remotePointsDB;

  var activeLocationWatch, countLocationPopup = 0;

  var orientationSupported, compassHeading = "-", watchNorthDirection, watchEastDirection, watchSouthDirection, watchWestDirection;

  var curLatLng = [0, 0], curLatLngAccuracy = 0;
  var classification = "", certainty = "60%", comment = "";

  var isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  var isApp = document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1;

  $.getJSON("https://landcover.como.polimi.it/couchdb/lcc_points/_all_docs?include_docs=true", function(json) {
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json));

    $(".download-data").attr("href", "data:" + data);
    $(".download-data").attr("download", "data.json");
  });

  function handleOrientation(event) {
    if (event.absolute) {
      orientationSupported = true;
      compassHeading = 360-Math.round(event.alpha);
      if (window.orientation == 90) // landscape-primary
        compassHeading = (compassHeading+90)%360;
      else if (window.orientation == -90) // landscape-secondary
        compassHeading = (compassHeading+270)%360;
      $("#orientation").text(compassHeading);
    }
    else if (event.webkitCompassHeading) {
      orientationSupported = true;
      compassHeading = Math.round(event.webkitCompassHeading);
      if (window.orientation == 90)
        compassHeading = (compassHeading+90)%360;
      else if (window.orientation == -90)
        compassHeading = (compassHeading+270)%360;
      $("#orientation").text(compassHeading);
    }
    else
      orientationSupported = false;
  }

  function addInstructions(parent, instructionText, imageIdArray, type) {
    var instruction = document.createElement("div");
    instruction.className = "instruction";
    instruction.innerHTML = instructionText;
    document.getElementById(parent + "-instructions-" + type + "s").appendChild(instruction);

    var instructionImages = document.createElement("div");

    for (var i = 0; i < imageIdArray.length; i++) {
      var image = document.createElement("img");
      image.src = "img/screenshots/" + type + "/" + ln.language + "/" + imageIdArray[i] + ".jpg";
      instructionImages.appendChild(image);
    }

    document.getElementById(parent + "-instructions-" + type + "s").appendChild(instructionImages);
  }

  uuid = device.uuid;
  if (uuid == null)
    uuid = new Fingerprint().get().toString() + "-PC";

  networkState = navigator.connection.type;

  // PouchDB & CouchDB settings
  localDB = new PouchDB("db_local_lcc");
  remoteUsersDB = new PouchDB(SETTINGS.db_users_url);
  remotePointsDB = new PouchDB(SETTINGS.db_points_url);

  /* localDB.allDocs(function(error, response) {
    if (error)
      return console.log(error);
    console.log(response.rows.length);
  }); */

  remotePointsDB.createIndex({
    index: {
      fields: ["user"]
    }
  });

  bing = new L.tileLayer.bing("AqSfYcbsnUwaN_5NvJfoNgNnsBfo1lYuRUKsiVdS5wQP3gMX6x8xuzrjZkWMcJQ1", {type: "AerialWithLabels"});

  osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
    errorTileUrl: "img/errorTile.png"
  });

  $("#bing").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.bingNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
    else {
      map.removeLayer(osm);
      map.addLayer(bing);
    }
  });

  $("#osm").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.osmNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
    else {
      if (map.hasLayer(bing))
        map.removeLayer(bing);
      if (!map.hasLayer(osm))
      map.addLayer(osm);
    }
  });

  function setMarkerClassIcon(classPOI) {
    function getClassImage(classPOI) {
      if (classPOI == null || classPOI == undefined) {
        return "";
      }
      return  "<img id='class-blue-marker' src='img/classes/" + classPOI + "WhiteBackground.png'>";
    }
    var icon = L.divIcon({
      iconSize: [54, 85],
      iconAnchor: [27, 97],
      popupAnchor: [0, -85],
      html: getClassImage(classPOI) + "<img id='blue-marker' src='img/markerBlue.png'>"
    });
    return icon;
  }

  marker = L.marker(curLatLng, {icon: setMarkerClassIcon(), draggable: true});

  marker.on("dragend", function(event) {
    var latLng = event.target.getLatLng();
    curLatLng = [latLng.lat, latLng.lng];
    curLatLngAccuracy = 0;
  });

  function getLocation() {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        curLatLng = [position.coords.latitude, position.coords.longitude];
        curLatLngAccuracy = position.coords.accuracy;
        map.panTo(curLatLng);
        marker.setLatLng (curLatLng);
        marker.bindPopup(i18n.t("messages.markerPopup")).openPopup();
        clearInterval(activeLocationWatch);
      },
      function(error) {
        if(!isMobile) {
          marker.bindPopup(i18n.t("messages.gpsError")).openPopup();
          clearInterval(activeLocationWatch);
        }
        else {
          if (countLocationPopup == 0) {
            marker.bindPopup(i18n.t("messages.gpsErrorMobile")).openPopup();
            countLocationPopup++;
          }
        }
      },
      {timeout: 3000, enableHighAccuracy: true}
    );
  }

  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend"));
  L.DomEvent.disableClickPropagation(L.DomUtil.get("guidelines"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("guidelines"));

  $("#navbar-registration").click(function() {
    $("#start-information").hide();
    $("#registration").show();
  });

  $("#navbar-start-information").click(function() {
    $("#registration").hide();
    addInstructions("start", i18n.t("information.instructions.registration"), [1, 2, 3], "application");
    addInstructions("start", i18n.t("information.instructions.registration"), [1, 2, 3], "browser");
    addInstructions("start", i18n.t("information.instructions.location"), [4, 5], "application");
    addInstructions("start", i18n.t("information.instructions.location"), [4, 5], "browser");
    addInstructions("start", i18n.t("information.instructions.guidelines"), [6], "application");
    addInstructions("start", i18n.t("information.instructions.guidelines"), [6], "browser");
    addInstructions("start", i18n.t("information.instructions.classification"), [7, 8], "application");
    addInstructions("start", i18n.t("information.instructions.classification"), [7, 8], "browser");
    addInstructions("start", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "application");
    addInstructions("start", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "browser");
    addInstructions("start", i18n.t("information.instructions.takePhotoNorth"), [11, 12], "application");
    addInstructions("start", i18n.t("information.instructions.choosePhotoNorth"), [11, 12], "browser");
    addInstructions("start", i18n.t("information.instructions.takePhotoEastSouthWest"), [13, 14, 15], "application");
    addInstructions("start", i18n.t("information.instructions.choosePhotoEastSouthWest"), [13, 14, 15], "browser");
    addInstructions("start", i18n.t("information.instructions.submission"), [16, 17], "application");
    addInstructions("start", i18n.t("information.instructions.submission"), [16, 17], "browser");
    addInstructions("start", i18n.t("information.instructions.myMap"), [18, 19], "application");
    addInstructions("start", i18n.t("information.instructions.myMap"), [18, 19], "browser");
    addInstructions("start", i18n.t("information.instructions.everyone"), [20, 21], "application");
    addInstructions("start", i18n.t("information.instructions.everyone"), [20, 21], "browser");
    $("#start-information").show();
  });

  $("#register").click(function() {
    function registrationSuccess() {
      $("#start-page").hide();
      $("#main-page").show();
      $("body").css("overflow-y", "hidden");
      onResize();

      map = L.map("map", {
        center: curLatLng,
        zoom: 3
      });
      osm.addTo(map);
      marker.addTo(map);

      activeLocationWatch = setInterval(getLocation, 4000);

      window.localStorage.setItem("isLaunched", true);
    }

    var gender = $("#gender").val();
    var age = $("#age").val();
    var workstatus = $("#workstatus").val();

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.registrationNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }

    if (gender == null || age == null || workstatus == null) {
      navigator.notification.alert(i18n.t("messages.registrationFormEmpty"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }

    // register user
    var timestamp = new Date().toISOString();
    remoteUsersDB.get(uuid).then(function(doc) {
      // if exists, update the user
      var user = {
        _id: uuid,
        _rev: doc._rev,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(error) {
        if (!error)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + error, null, "Land Cover Collector", i18n.t("messages.ok"));
      });
    }).catch(function(error) {
      // if not exists, add the user
      var user = {
        _id: uuid,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(error) {
        if (!error)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + error, null, "Land Cover Collector", i18n.t("messages.ok"));
      });
    });
  });

  // check whether it is the first time launch
  if (window.localStorage.getItem("isLaunched")) {
    $("#start-page").hide();
    $("#main-page").show();
    $("body").css("overflow-y", "hidden");
    onResize();

    map = L.map("map", {
      center: curLatLng,
      zoom: 3
    });
    osm.addTo(map);
    marker.addTo(map);

    activeLocationWatch = setInterval(getLocation, 4000);
  }
  else {
    $("#start-page").show();
    $("#main-page").hide();
  }

  $("#navbar-add").click(function() {
    $("#map, #add-menu, #guidelines").show();
    $("#main-information, #mymap-stat, #allmap-stat, #legend-button, #legend").hide();
    $("body").css("overflow-y", "hidden");

    map.panTo(curLatLng);
    marker.setLatLng (curLatLng);

    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }
    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }
    if (!map.hasLayer(marker))
      map.addLayer(marker);
  });

  $("#add-menu-start").click(function() {
    $("#add-menu").hide();
    $("#classes-menu").show();
    $("#class-next, #certainty-next, #photo-north-next, #photo-east-next, #photo-south-next, #photo-west-next").addClass("ui-disabled");
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").addClass("ui-disabled");

    // set all forms to initial values
    $("#radio-choice-1, #radio-choice-2, #radio-choice-3, #radio-choice-4, #radio-choice-5, #radio-choice-6, #radio-choice-7, #radio-choice-8, #radio-choice-9, #radio-choice-10").prop("checked",false).checkboxradio("refresh");
    $("#classes-select").text(i18n.t("menu.selectClassification"));
    $("#comment-input").val("");
    $("#slider").val(3).slider("refresh");

    if (isApp) {
      $("#input-file").hide();
      $(".choose-photo").hide();
    }
    else {
      $(".take-photo").hide();
    }

    if ("ondeviceorientation" in window) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    // set all initial values
    classification = "";
    photoNorth = "";
    photoEast = "";
    photoSouth = "";
    photoWest = "";
    photoNorthThumbnail = "";
    photoEastThumbnail = "";
    photoSouthThumbnail = "";
    photoWestThumbnail = "";
    directionNorth = "-";
    directionEast = "-";
    directionSouth = "-";
    directionWest = "-",
    certainty = "60%";
    comment= "";
  });

  $("#navbar-my").click(function() {
    $("#main-information, #add-menu, #allmap-stat, #legend, #guidelines").hide();
    $("#map, #legend-button").show();
    $("body").css("overflow-y", "hidden");

    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }
    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }

    if (map.hasLayer(marker))
      map.removeLayer(marker);

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.myNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }
    else {
      remotePointsDB.find({
        selector: {
          user: uuid
        }
      }).then(function(response) {
        var ids=[];
        var timestamps=[];
        var locations=[];
        var classes=[];
        var certainties=[];
        var comments=[];
        var count=0;
        response.docs.forEach(function(doc) {
          if (doc.location!=null && doc.classification!=null) {
            ids.push(doc._id);
            timestamps.push(doc.timestamp);
            locations.push(doc.location);
            classes.push(doc.classification);
            certainties.push(doc.certainty);
            comments.push(doc.comment);
            count++;
          }
        });

        markersMy = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments);
        if (count == 0)
          $("#mymap-stat").html(i18n.t("stat.noContrMy") +"<br><br>");
        else if (count == 1)
          $("#mymap-stat").html(i18n.t("stat.totalMy") + " " + count + " " + i18n.t("stat.contrMySingle") + "<br><br>");
        else
          $("#mymap-stat").html(i18n.t("stat.totalMy") + " " + count + " " + i18n.t("stat.contrMyPlural") + "<br><br>");

        $("#mymap-stat").show();
      });
    }
  });

  $("#navbar-all").click(function() {
    $("#main-information, #add-menu, #mymap-stat, #legend, #guidelines").hide();
    $("#map, #legend-button").show();
    $("body").css("overflow-y", "hidden");

    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }
    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }

    if (map.hasLayer(marker))
      map.removeLayer(marker);

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.allNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }
    else {
      remotePointsDB.allDocs({include_docs: true}, function(error, response) {
        if (error) {
          navigator.notification.alert(i18n.t("messages.error"), null, "Land Cover Collector", i18n.t("messages.ok"));
          return;
        }
        else {
          var ids=[];
          var timestamps=[];
          var locations=[];
          var classes=[];
          var certainties=[];
          var comments=[];
          var count=0;
          response.rows.forEach(function(row) {
            if (row.doc.location!=null && row.doc.classification!=null) {
              ids.push(row.doc._id);
              locations.push(row.doc.location);
              timestamps.push(row.doc.timestamp);
              classes.push(row.doc.classification);
              certainties.push(row.doc.certainty);
              comments.push(row.doc.comment);
              count++;
            }
          });

          markersAll = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments);

          var count = 0;
          var dist;
          var curLatLngL = L.latLng(curLatLng[0], curLatLng[1]);
          for (var i = 0; i < ids.length; i++) {
            dist = curLatLngL.distanceTo(L.latLng(locations[i][0], locations[i][1]));
            if (dist <= 5000) {
              count++;
            }
          }
          if (count == 0)
            $("#allmap-stat").html(i18n.t("stat.noContrAll") +"<br/><br/>");
          else if (count == 1)
            $("#allmap-stat").html(i18n.t("stat.totalAllSingle") + " " + count + " " + i18n.t("stat.contrAllSingle") + "<br><br>");
          else
            $("#allmap-stat").html(i18n.t("stat.totalAllPlural") + " " + count + " " + i18n.t("stat.contrAllPlural") + "<br><br>");

          $("#allmap-stat").show();
        }
      });
    }
  });

  $("#navbar-main-information").click(function() {
    $("#add-menu, #mymap-stat, #allmap-stat, #map").hide();
    addInstructions("main", i18n.t("information.instructions.registration"), [1, 2, 3], "application");
    addInstructions("main", i18n.t("information.instructions.registration"), [1, 2, 3], "browser");
    addInstructions("main", i18n.t("information.instructions.location"), [4, 5], "application");
    addInstructions("main", i18n.t("information.instructions.location"), [4, 5], "browser");
    addInstructions("main", i18n.t("information.instructions.guidelines"), [6], "application");
    addInstructions("main", i18n.t("information.instructions.guidelines"), [6], "browser");
    addInstructions("main", i18n.t("information.instructions.classification"), [7, 8], "application");
    addInstructions("main", i18n.t("information.instructions.classification"), [7, 8], "browser");
    addInstructions("main", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "application");
    addInstructions("main", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "browser");
    addInstructions("main", i18n.t("information.instructions.takePhotoNorth"), [11, 12], "application");
    addInstructions("main", i18n.t("information.instructions.choosePhotoNorth"), [11, 12], "browser");
    addInstructions("main", i18n.t("information.instructions.takePhotoEastSouthWest"), [13, 14, 15], "application");
    addInstructions("main", i18n.t("information.instructions.choosePhotoEastSouthWest"), [13, 14, 15], "browser");
    addInstructions("main", i18n.t("information.instructions.submission"), [16, 17], "application");
    addInstructions("main", i18n.t("information.instructions.submission"), [16, 17], "browser");
    addInstructions("main", i18n.t("information.instructions.myMap"), [18, 19], "application");
    addInstructions("main", i18n.t("information.instructions.myMap"), [18, 19], "browser");
    addInstructions("main", i18n.t("information.instructions.everyone"), [20, 21], "application");
    addInstructions("main", i18n.t("information.instructions.everyone"), [20, 21], "browser");
    $("#main-information").show();
    $("body").css("overflow-y", "visible");
  });

  $("#class-cancel").click(function() {
    $("#add-menu").show();
    $("#classes-menu").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").removeClass("ui-disabled");
    marker.setIcon(setMarkerClassIcon());

   if ("ondeviceorientation" in window)
      window.removeEventListener("deviceorientation", handleOrientation);
  });

  $("#class-next").click(function() {
    $("#classes-menu").hide();
    $("#certainty-slider").show();
  });

  $("#certainty-back").click(function() {
    $("#certainty-slider").hide();
    $("#classes-menu").show();
  });

  $("#certainty-next").click(function() {
    $("#certainty-slider").hide();
    $("#comment").show();
  });

  $("#comment-back").click(function() {
    $("#comment").hide();
    $("#certainty-slider").show();
  });

  $("#comment-next").click(function() {
    comment =  $("#comment-input").val();
    $("#comment").hide();
    $("#photo-north").show();

    if (orientationSupported) {
      $("#orientation").show();

      watchNorthDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 330 || compassHeading <= 30))
            $("#photo-north .take-photo").removeClass("ui-disabled");
          else
            $("#photo-north .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-north-back").click(function() {
    $("#photo-north").hide();
    $("#comment").show();

    if (orientationSupported) {
      $("#orientation").hide();
      clearInterval(watchNorthDirection);
    }
  });

  $("#photo-north-next").click(function() {
    $("#photo-north").hide();
    $("#photo-east").show();

    if (orientationSupported) {
      clearInterval(watchNorthDirection);

      watchEastDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 60 && compassHeading <= 120))
            $("#photo-east .take-photo").removeClass("ui-disabled");
          else
            $("#photo-east .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-east-back").click(function() {
    $("#photo-east").hide();
    $("#photo-north").show();

    if (orientationSupported) {
      clearInterval(watchEastDirection);

      watchNorthDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 330 || compassHeading <= 30))
            $("#photo-north .take-photo").removeClass("ui-disabled");
          else
            $("#photo-north .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-east-next").click(function() {
    $("#photo-east").hide();
    $("#photo-south").show();

    if (orientationSupported) {
      clearInterval(watchEastDirection);

      watchSouthDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 150 && compassHeading <= 210))
            $("#photo-south .take-photo").removeClass("ui-disabled");
          else
            $("#photo-south .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-south-back").click(function() {
    $("#photo-south").hide();
    $("#photo-east").show();

    if (orientationSupported) {
      clearInterval(watchSouthDirection);

      watchEastDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 60 && compassHeading <= 120))
            $("#photo-east .take-photo").removeClass("ui-disabled");
          else
            $("#photo-east .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-south-next").click(function() {
    $("#photo-south").hide();
    $("#photo-west").show();

    if (orientationSupported) {
      clearInterval(watchSouthDirection);

      watchWestDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 240 && compassHeading <= 300))
            $("#photo-west .take-photo").removeClass("ui-disabled");
          else
            $("#photo-west .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-west-back").click(function() {
    $("#photo-west").hide();
    $("#photo-south").show();

    if (orientationSupported) {
      clearInterval(watchWestDirection);

      watchSouthDirection = setInterval(function() {
        if (isApp) {
          if ((window.orientation == 90 || window.orientation == -90) && (compassHeading >= 150 && compassHeading <= 210))
            $("#photo-south .take-photo").removeClass("ui-disabled");
          else
            $("#photo-south .take-photo").addClass("ui-disabled");
        }
      }, 200);
    }
  });

  $("#photo-west-next").click(function() {
    $("#photo-west").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").removeClass("ui-disabled");

    var timestamp = new Date().toISOString();
    var poi = {
      _id: timestamp,
      user: uuid,
      location: curLatLng,
      locationAccuracy: curLatLngAccuracy,
      lang: ln.language,
      timestamp: timestamp,
      classification: classification,
      certainty: certainty,
      comment: comment,
      directionNorth: directionNorth,
      directionEast: directionEast,
      directionSouth: directionSouth,
      directionWest: directionWest,
      _attachments:
      {
        "photo-north.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoNorth
        },
        "photo-east.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoEast
        },
        "photo-south.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoSouth
        },
        "photo-west.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoWest
        },
        "photo-north-thumbnail.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoNorthThumbnail
        },
        "photo-east-thumbnail.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoEastThumbnail
        },
        "photo-south-thumbnail.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoSouthThumbnail
        },
        "photo-west-thumbnail.jpeg":
        {
          content_type: "image\/jpeg",
          data: photoWestThumbnail
        }
      }
    };

    function contributionSuccess() {
      $("#add-menu").show();
      marker.setIcon(setMarkerClassIcon());
    }

    localDB.put(poi, function callback(error, response) {
      if (!error) {
        if (networkState == Connection.NONE || navigator.onLine == false)
          navigator.notification.alert(i18n.t("messages.contributionSuccessNoInternet"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.contributionSuccess"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));

        localDB.replicate.to(remotePointsDB, {retry: true}).on("complete", function(info) {
          localDB.destroy().then(function() {
            localDB = new PouchDB("db_local_lcc");
          });
        }).on("error", function(error) {
          console.log("Replication error: " + error);
        });
      }
      else {
        navigator.notification.alert(i18n.t("messages.errorStorage"), null, "Land Cover Collector", i18n.t("messages.ok"));

        remotePointsDB.put(poi, function callback(error) {
          if (!error)
            navigator.notification.alert(i18n.t("messages.contributionSuccess"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));
          else
            navigator.notification.alert(i18n.t("messages.error") + " " + error, null, "Land Cover Collector", i18n.t("messages.ok"));
        });
      }
    });

    marker.closePopup();
    marker.unbindPopup();

    if (orientationSupported) {
      $("#orientation").hide();
      clearInterval(watchWestDirection);
    }

    if ("ondeviceorientation" in window)
      window.removeEventListener("deviceorientation", handleOrientation);
  });

  $("#slider").bind("slidestop", function() {
    certainty = ($("#slider").val())*20+"%";
    $("#certainty-next").removeClass("ui-disabled");
  });

  $("input[type='radio']").click(function() {
    classification = $(this).val();
    $("#class-next").removeClass("ui-disabled");
  });

  // close the list of classes
  $("#class-ok").click(function(event) {
    event.preventDefault();
    setTimeout(function() {
      $("#classes-menu-list").popup("close");
    }, 1);
  });

  // close the list of classes - for iPad
  $("#class-ok").on("click touchstart", function(event) {
    event.preventDefault();
    setTimeout(function() {
      $("#classes-menu-list").popup("close");
    }, 1);
  });

  // set the text on the button to the selected class
  $("#classes-menu-list").on("popupafterclose", function() {
    if (classification != "") {
      var idOfValue = $("input[value='"+classification+"']").attr("id");
      var labelFor =  $("label[for='"+idOfValue+"']").text();
      $("#classes-select").text(labelFor);
      marker.setIcon(setMarkerClassIcon(classification));
    }
  });

  // make the list of classes scrollable
  $("#classes-menu-list").on({
    popupbeforeposition: function(e) {
      var maxHeight = $(window).height() - 20;
      $("#classes-menu-list").css("max-height", maxHeight + "px");
    }
  });

  /***
  photos - beginning
  ***/
  function resizeImage(img, activeDirection) {
    var resizeWidth = 300;
    var resizeHeight = img.height/img.width*resizeWidth;

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.width = resizeWidth;
    canvas.height = resizeHeight;
    ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);

    var dataUrl = canvas.toDataURL("image/jpeg");
    return dataUrl.substr(dataUrl.indexOf(",")+1);
  }

  // this function is called when the input loads a photo
  function renderPhoto(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
      var activeDivId = ($("#add-bottompanel").children().filter(function() {
        return $(this).css("display") === "block" && $(this).attr("id") !== "input-file";
      }).attr("id"));
      $("#"+activeDivId+"-next").removeClass("ui-disabled");
      var activeDirection = activeDivId.split("-")[1];

      var img = new Image();
      img.src = event.target.result;
      img.onload = function (e) {
        window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)] = img.src.substr(img.src.indexOf(",")+1);
        window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)+"Thumbnail"] = resizeImage(img);
      }
    };

    // when the file is read it triggers the onload event above
    reader.readAsDataURL(file);
  }

  // triggered when OK is clicked
  $("input[type='file']").change(function() {
    renderPhoto(this.files[0]);
  });

  $(".choose-photo").click(function() {
    $("input[type='file']").click();
  });

  function getPictureSuccess(pictureData) {
    var activeDivId = ($("#add-bottompanel").children().filter(function() {
      return $(this).css("display") === "block";
    }).attr("id"));

    $("#"+activeDivId+"-next").removeClass("ui-disabled");

    var activeDirection = activeDivId.split("-")[1];
    window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)] = pictureData;
    window["direction"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)] = compassHeading;

    var img = new Image();
    img.src = "data:image/jpeg;base64,"+pictureData;
    img.onload = function (e) {
      window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)+"Thumbnail"] = resizeImage(img);
    }
  }

  function getPictureFail(message) {
    console.log("Failed taking photo, message: " + message);
  }

  $(".take-photo").click(function() {
    navigator.camera.getPicture(getPictureSuccess, getPictureFail, {
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA
    });
  });
  /***
  photos - end
  ***/
}

$("#map").on("click", ".popup-right-arrow", function(event) {
  $(this).parent().css("display", "none");

  var parentClassNameSplitted = $(this).parent().attr("class").split("-");
  var direction = parentClassNameSplitted[parentClassNameSplitted.length - 1];
  if (direction == "north")
    $(this).parent().siblings(".popup-photos-east").css("display", "block");
  else if (direction == "east")
    $(this).parent().siblings(".popup-photos-south").css("display", "block");
  else if (direction == "south")
    $(this).parent().siblings(".popup-photos-west").css("display", "block");
});

$("#map").on("click", ".popup-left-arrow", function(event) {
  $(this).parent().css("display", "none");

  var parentClassNameSplitted = $(this).parent().attr("class").split("-");
  var direction = parentClassNameSplitted[parentClassNameSplitted.length - 1];
  if (direction == "west")
    $(this).parent().siblings(".popup-photos-south").css("display", "block");
  else if (direction == "south")
    $(this).parent().siblings(".popup-photos-east").css("display", "block");
  else if (direction == "east")
    $(this).parent().siblings(".popup-photos-north").css("display", "block");
});

var popupPhotos = document.createElement("div");
popupPhotos.className = "popup-photos";

var popupRightArrow = document.createElement("img");
popupRightArrow.className = "popup-right-arrow";
popupRightArrow.src = "img/rightTriangleSmall.png";

var popupLeftArrow = document.createElement("img");
popupLeftArrow.className = "popup-left-arrow";
popupLeftArrow.src = "img/leftTriangleSmall.png";

var popupTextNorth = document.createElement("span");
popupTextNorth.className = "popup-text-north";
var popupTextEast = document.createElement("span");
var popupTextSouth = document.createElement("span");
var popupTextWest = document.createElement("span");

var popupPhotosNorth = document.createElement("div");
popupPhotosNorth.className = "popup-photos-north";

var popupPhotosEast = document.createElement("div");
popupPhotosEast.className = "popup-photos-east";

var popupPhotosSouth = document.createElement("div");
popupPhotosSouth.className = "popup-photos-south";

var popupPhotosWest = document.createElement("div");
popupPhotosWest.className = "popup-photos-west";

popupPhotos.appendChild(popupPhotosNorth);
popupPhotos.appendChild(popupPhotosEast);
popupPhotos.appendChild(popupPhotosSouth);
popupPhotos.appendChild(popupPhotosWest);

function addPopupPhotos(id) {
  window["photoNorth"+id] = document.createElement("img");
  window["photoNorth"+id].src = "https://landcover.como.polimi.it/couchdb/lcc_points/" + id + "/photo-north-thumbnail.jpeg";
  popupPhotosNorth.innerHTML = "";
  popupTextNorth.innerHTML = "<b>" + i18n.t("popup.northPhoto") + ":</b><br>";
  popupPhotosNorth.appendChild(popupTextNorth.cloneNode(true));
  popupPhotosNorth.appendChild(window["photoNorth"+id]);
  popupPhotosNorth.appendChild(popupRightArrow.cloneNode(true));

  window["photoEast"+id] = document.createElement("img");
  window["photoEast"+id].src = "https://landcover.como.polimi.it/couchdb/lcc_points/" + id + "/photo-east-thumbnail.jpeg";
  popupPhotosEast.innerHTML = "";
  popupTextEast.innerHTML = "<b>" + i18n.t("popup.eastPhoto") + ":</b><br>";
  popupPhotosEast.appendChild(popupTextEast.cloneNode(true));
  popupPhotosEast.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosEast.appendChild(window["photoEast"+id]);
  popupPhotosEast.appendChild(popupRightArrow.cloneNode(true));

  window["photoSouth"+id] = document.createElement("img");
  window["photoSouth"+id].src = "https://landcover.como.polimi.it/couchdb/lcc_points/" + id + "/photo-south-thumbnail.jpeg";
  popupPhotosSouth.innerHTML = "";
  popupTextSouth.innerHTML = "<b>" + i18n.t("popup.southPhoto") + ":</b><br>";
  popupPhotosSouth.appendChild(popupTextSouth.cloneNode(true));
  popupPhotosSouth.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosSouth.appendChild(window["photoSouth"+id]);
  popupPhotosSouth.appendChild(popupRightArrow.cloneNode(true));

  window["photoWest"+id] = document.createElement("img");
  window["photoWest"+id].src = "https://landcover.como.polimi.it/couchdb/lcc_points/" + id + "/photo-west-thumbnail.jpeg";
  popupPhotosWest.innerHTML = "";
  popupTextWest.innerHTML = "<b>" + i18n.t("popup.westPhoto") + ":</b><br>";
  popupPhotosWest.appendChild(popupTextWest.cloneNode(true));
  popupPhotosWest.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosWest.appendChild(window["photoWest"+id]);

  return popupPhotos.outerHTML;
}

function isCommentEmpty(comment) {
  if (comment == "")
    return "";
  else
    return "<b>" + i18n.t("popup.comment") + ":</b> " + comment + "<br>";
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

// visualizing POIs using marker cluster
function vizPOIs (map, ids, timestamps, locations, classes, certainties, comments) {
  var str = "";
  var markerClusters = [];
  var marker;
  var locationIcon;

  classesUnique = classes.filter(onlyUnique);

  for (var i = 0; i < classesUnique.length; i++) {
    str = "markers" + classesUnique[i].charAt(0).toUpperCase() + classesUnique[i].slice(1);
    window[str] = L.markerClusterGroup();
    markerClusters.push(window[str]);
  }

  for (i = 0; i < ids.length; i++) {
    locationIcon = L.icon({
      iconUrl: "img/classes/" + classes[i] + "WhiteBackground.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
    marker = L.marker(locations[i], {icon: locationIcon});
    marker.bindPopup("<b>" + i18n.t("popup.class") + ":</b> " + i18n.t("classes."+classes[i]) + "<br><b>" + i18n.t("popup.date") + ":</b> " + new Date(timestamps[i]).toLocaleString() + "<br><b>" + i18n.t("popup.certainty") + ":</b> " + certainties[i] + "<br>" + isCommentEmpty(comments[i]) + addPopupPhotos(ids[i]));
    marker.mydata = classes[i];
    str = "markers" + classes[i].charAt(0).toUpperCase() + classes[i].slice(1);
    window[str].addLayer(marker);
  }

  for (i = 0; i < classes.length; i++) {
    var str = "markers" + classes[i].charAt(0).toUpperCase() + classes[i].slice(1);
    map.addLayer(window[str]);
  }

  return markerClusters;
}

$("#start-instructions-applications-button").click(function() {
  $("#start-instructions-applications").slideToggle({"duration": 200});
});

$("#start-instructions-browsers-button").click(function() {
  $("#start-instructions-browsers").slideToggle({"duration": 200});
});

$("#start-acknowledgements-button").click(function() {
  $("#start-acknowledgements").slideToggle({"duration": 200});
});

$("#start-download-button").click(function() {
  $("#start-download").slideToggle({"duration": 200});
});

$("#main-instructions-applications-button").click(function() {
  $("#main-instructions-applications").slideToggle({"duration": 200});
});

$("#main-instructions-browsers-button").click(function() {
  $("#main-instructions-browsers").slideToggle({"duration": 200});
});

$("#main-acknowledgements-button").click(function() {
  $("#main-acknowledgements").slideToggle({"duration": 200});
});

$("#main-download-button").click(function() {
  $("#main-download").slideToggle({"duration": 200});
});

$("#terms-and-conditions-button").click(function() {
  $("#terms-and-conditions-list").slideToggle({"duration": 200});
});

var legendHeight, legendWidth, guidelinesListHeight;

function adjustLegend() {
  if (legendHeight+108 > $("#map").height()) {
    $("#legend").css("height", ($("#map").height()-108) + "px");
    $("#legend").css("width", (legendWidth+10) + "px");
  }
  else {
    $("#legend").css("height", "auto");
    $("#legend").css("width", "auto");
  }
}

$("#legend-button").on("vclick", function() {
  $("#legend").toggle();

  legendHeight = document.getElementById("legend").scrollHeight;
  legendWidth = $("#legend").width();

  adjustLegend();
});

function adjustGuidelinesList() {
  if (guidelinesListHeight+140 > $("#map").height())
    $("#guidelines-list").css("height", ($("#map").height()-140) + "px");
  else
    $("#guidelines-list").css("height", "auto");

  if (410 > $("#map").width())
    $("#guidelines-list").css("width", ($("#map").width()-90) + "px");
  else
    $("#guidelines-list").css("width", "320px");
}

$("#guidelines-button").on("vclick", function() {
  $("#guidelines-list").toggle();
  guidelinesListHeight = document.getElementById("guidelines-list").scrollHeight;

  adjustGuidelinesList();
});

function onResize() {
  $("#map").height($(window).height() - $("#map").offset().top);

  adjustLegend();
  adjustGuidelinesList();
}

function initialize() {
  ln.init();
}

function onLoad() {
  document.addEventListener("deviceready", initialize, false);
}
