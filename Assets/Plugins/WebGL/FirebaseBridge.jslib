var FirebaseBridgeLib = {
    InitFirebaseBridge: function () {
        if (!window.__fbAuth) {
            //'__' is a naming convention for window variables
            window.__fbAuth = { uid: null, idToken: null, displayName: null, projectId: null }
        }
        //send data from child to the parent window to handle it when the game is reloaded 
        function handleAuth(data) {
            window.__fbAuth.uid = data.uid;
            window.__fbAuth.idToken = data.idToken;
            window.__fbAuth.displayName = data.displayName || "Player";
            window.__fbAuth.projectId = data.projectId || "";

            var payload = JSON.stringify(window.__fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload);

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "firebase-auth-ack" }, "*");
                console.log("send ack to portal");
            }
        }

        if (!window.__firebaseBridgeInit) {
            window.__firebaseBridgeInit = true;

            window.addEventListener("message", function (event) {
                var data = event.data;
                if (!data || data.type !== "firebase-auth") return;
                handleAuth(data);
            })
            console.log("Listener registered. waiting auth from portal...")
        }
        //Used for when the game is reloaded without having to send data to the window
        if (window.__fbAuth && window.__fbAuth.uid && window.__fbAuth.idToken) {
            var payload = JSON.stringify(window.__fbAuth);
            SendMessage("FirebaseManager", "OnAuthReceived", payload);
        }
    },

    SubmitScoreToFirestore: function (jsonBodyPtr) {
        var jsonBody = UTF8ToString(jsonBodyPtr);
        var parsed = JSON.parse(jsonBody);

        var auth = window.__fbAuth;
        if (!auth || !auth.idToken || !auth.projectId) {
            console.warn("No auth, score not submitted");
            return;
        }

        var baseURL = "https://firestore.googleapis.com/v1/projects" + auth.projectId + "/databases/(default)/documents";

        var headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer" + auth.idToken,
        };

        var scoreDoc = {
            fields: {
                userId: { stringValue: auth.uid },
                score: { integerValue: String(parsed.score) },
                pipes: { integerValue: String(parsed.pipes) },
                duration: { integerValue: String(parsed.duration) },
                timestamp: { timestampValue: new Date().toISOString() }
            }
        }

        fetch(baseURL + "/scores", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(scoreDoc)
        })
            .then(function (res) { return res.json(); })
            .then(function (data) { console.log("scored saved: ", data.name) })
            .catch(function (err) { console.log("Score POST failed", err); });

        var userDocUrl = baseURL + "/users/" + auth.uid;

        fetch(userDocUrl, {
            method: "GET",
            headers: headers,

        })
            .then(function (res) { return res.json(); })
            .then(function (doc) {
                var currentHigh = 0;
                var currentGames = 0;

                if (doc.fields) {
                    if (doc.fields.highScore) currentHigh = parseInt(doc.fields.highScore.integerValue || "0");
                    if (doc.fields.gamesPlayed) currentGames = parseInt(doc.fields.gamesPlayed.integerValue || "0");
                }

                var newHigh = Math.max(currentHigh, parsed.score);
                var newGames = currentGames + 1;

                var patchBody = {
                    fields: {
                        highScore: { integerValue: String(newHigh) },
                        gamesPlayed: { integerValue: String(newGames) }
                    }
                };

                return fetch(userDocUrl + "?updateMask.fieldPaths=highScore&updateMask.fieldPaths+gamesPlayer", {
                    method: "PATCH",
                    headers: headers,
                    body: JSON.stringify(patchBody)
                })
            })
            .then(function (res) { return res.json(); })
            .then(function (data) { console.log("User profile updated"); })
            .catch(function (err) { console.error("User PATCH failes", e); });

    }
};

mergeInto(LibraryManager.library, FirebaseBridgeLib);