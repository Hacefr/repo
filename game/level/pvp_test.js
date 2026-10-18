(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const isZombie = urlParams.get("role") === "zombie";

    // 1. Establish WebSocket Connection
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    window.pvpSocket = new WebSocket(protocol + window.location.host);

    window.pvpSocket.onopen = () => {
        console.log("[PvP] Connected to Match Relay as:", isZombie ? "ZOMBIE" : "PLANT");
    };

    // 2. Handle incoming moves from the opponent
    window.pvpSocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === "REMOTE_PLANT") {
                const Unit = window[data.unit];
                if (Unit) {
                    new Unit().Birth(data.c, data.r, data.rType, data.cType, []);
                }
            } else if (data.type === "REMOTE_ZOMBIE") {
                const Unit = window[data.unit];
                if (Unit) {
                    let zombie = new Unit();
                    asyncInnerHTML(
                        zombie.CustomBirth(data.rType, 9, 0, "auto"),
                        (ele, instance) => {
                            EDPZ.appendChild(ele);
                            instance.Birth();
                        },
                        zombie
                    );
                }
            }
        } catch (e) {
            console.error("[PvP Sync Error]", e);
        }
    };

    // 3. Hook GrowPlant to broadcast local actions
    if (!window.originalGrowPlant) {
        window.originalGrowPlant = GrowPlant;
        GrowPlant = function (plants, c, r, rType, cType) {
            const cardIdx = oS.ChoseCard;
            const card = ArCard[cardIdx];
            const UnitClass = card.PName;
            const unitName = UnitClass.prototype.EName;

            if (window.pvpSocket && window.pvpSocket.readyState === 1) {
                if (!oS.CardKind) {
                    // We planted a plant
                    window.pvpSocket.send(JSON.stringify({
                        type: "REMOTE_PLANT",
                        unit: unitName,
                        c: c, r: r, rType: rType, cType: cType
                    }));
                } else {
                    // We deployed a zombie
                    window.pvpSocket.send(JSON.stringify({
                        type: "REMOTE_ZOMBIE",
                        unit: unitName,
                        rType: rType, cType: cType
                    }));
                }
            }
            return window.originalGrowPlant(plants, c, r, rType, cType);
        };
    }

    // 4. Initialize Level Config
    const config = {
        PName: [oPeashooter, oSunFlower, oWallNut, oSnowPea, oRepeater, oSquash],
        ZName: [oIZombie, oIConeheadZombie, oIPoleVaultingZombie, oIBucketheadZombie, oIFootballZombie],
        PicArr: ["images/interface/background1.jpg"],
        backgroundImage: "images/interface/background1.jpg",
        ShowScroll: false,
        SunNum: 1000,
        ProduceSun: true,
        LevelName: isZombie ? "PvP Arena (Zombies)" : "PvP Arena (Plants)",
        StartGameMusic: "UraniwaNi",
        LoadAccess(callback) {
            callback();
        }
    };

    // ONLY set CardKind if it is the Zombie player!
    if (isZombie) {
        config.CardKind = 1;
    }

    oS.Init(config);
})();
