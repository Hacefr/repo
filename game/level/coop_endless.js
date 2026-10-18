(function () {
    const playerNum = window.pvpPlayerNum || 1;
    const roomCode = window.pvpRoomCode || "TEST";
    const isHost = playerNum === 1;

    console.log("[Co-op] Initializing as Player " + playerNum + " in Room " + roomCode);

    const speedBtn = $("dSpeed") || document.querySelector(".speed") || document.getElementById("Speed");
    if (speedBtn) speedBtn.style.display = "none";

    const socket = window.pvpSocket;

    let teammateCursor = document.getElementById("teammate-cursor");
    if (!teammateCursor) {
        teammateCursor = document.createElement("div");
        teammateCursor.id = "teammate-cursor";
        teammateCursor.style.cssText = "position:absolute;pointer-events:none;z-index:500;display:none;transition:left 0.04s linear,top 0.04s linear;";
        teammateCursor.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:${isHost ? "#ff4d4d" : "#00b4d8"};border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.8);"></div><span style="font-size:11px;font-weight:bold;background:rgba(0,0,0,0.8);color:white;padding:2px 5px;border-radius:4px;margin-left:18px;margin-top:-12px;display:inline-block;">${isHost ? "P2" : "P1"}</span><div id="teammate-ghost-plant" style="opacity:0.6;margin-top:5px;margin-left:5px;"></div>`;
        document.body.appendChild(teammateCursor);
    }

    let lastCursorSend = 0;
    document.addEventListener("mousemove", (e) => {
        const now = Date.now();
        if (now - lastCursorSend > 40 && socket && socket.readyState === 1) {
            lastCursorSend = now;
            let currentCard = oS.ChoseCard !== -1 && ArCard[oS.ChoseCard] ? ArCard[oS.ChoseCard].PName.prototype.EName : null;
            socket.send(JSON.stringify({ type: "CURSOR_MOVE", x: e.pageX, y: e.pageY, plant: currentCard }));
        }
    });

    if (socket) {
        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "ALL_READY_ROCK") {
                    oS.ScrollBack(LetsGO);
                }
                else if (data.type === "DRAFT_CLAIM" && data.plant !== "oSunFlower") {
                    const cardDom = $("Card" + data.plant);
                    if (cardDom) {
                        cardDom.style.pointerEvents = "none";
                        cardDom.style.filter = "grayscale(1) brightness(0.7)";
                        let badge = document.getElementById("badge_" + data.plant);
                        if (!badge) {
                            badge = document.createElement("div");
                            badge.id = "badge_" + data.plant;
                            badge.innerText = isHost ? "P2" : "P1";
                            badge.style.cssText = "position:absolute;top:2px;right:2px;background:#e63946;color:white;font-size:10px;font-weight:bold;padding:1px 4px;border-radius:3px;z-index:10;";
                            cardDom.appendChild(badge);
                        }
                    }
                }
                else if (data.type === "DRAFT_RELEASE" && data.plant !== "oSunFlower") {
                    const cardDom = $("Card" + data.plant);
                    if (cardDom) {
                        cardDom.style.pointerEvents = "auto";
                        cardDom.style.filter = "none";
                        const badge = document.getElementById("badge_" + data.plant);
                        if (badge) badge.remove();
                    }
                }
                else if (data.type === "CURSOR_MOVE") {
                    teammateCursor.style.display = "block";
                    teammateCursor.style.left = data.x + "px";
                    teammateCursor.style.top = data.y + "px";
                    const ghostContainer = document.getElementById("teammate-ghost-plant");
                    if (data.plant && window[data.plant]) {
                        const proto = window[data.plant].prototype;
                        ghostContainer.innerHTML = `<img src="${proto.PicArr[proto.CardGif]}" style="width:40px;height:40px;" />`;
                    } else {
                        ghostContainer.innerHTML = "";
                    }
                }
                else if (data.type === "REMOTE_PLANT") {
                    const Unit = window[data.unit];
                    if (Unit) {
                        let p = new Unit();
                        p.owner = data.owner;
                        p.Birth(data.c, data.r, data.rType, data.cType, []);
                    }
                }
                else if (data.type === "GLOBAL_COOLDOWN") {
                    for (let i = 0; i < ArCard.length; i++) {
                        if (ArCard[i] && ArCard[i].PName === oSunFlower) {
                            ArCard[i].CDReady = 0;
                            DoCoolTimer(i, data.coolTime || 12);
                            if (oS.ChoseCard === i) {
                                ClearChild($("MovePlant"));
                                SetHidden($("MovePlantAlpha"));
                                oS.ChoseCard = -1;
                            }
                            break;
                        }
                    }
                }
                else if (data.type === "REMOTE_SHOVEL") {
                    let p = oGd.$[data.row + "_" + data.col + "_1"];
                    if (p) p.Die();
                }
                else if (data.type === "SPAWN_SUN_GUEST" && !isHost) {
                    if (typeof AppearSun === "function") {
                        AppearSun(data.x, data.y, data.amount, data.isDrop);
                    }
                }
                else if (data.type === "GUEST_CLICKED_SUN" && isHost) {
                    oS.SunNum += 50;
                    broadcastSun();
                }
                else if (data.type === "GUEST_SPEND_SUN" && isHost) {
                    oS.SunNum = Math.max(0, oS.SunNum - data.cost);
                    broadcastSun();
                }
                else if (data.type === "SET_BANK_SUN") {
                    oS.SunNum = data.sun;
                    innerText(ESSunNum, oS.SunNum);
                }
                // BULLETPROOF WAVE_BUNDLE_EXACT RECEIVER
                else if (data.type === "WAVE_BUNDLE_EXACT" && !isHost) {
                    if (!data.zombies || !data.zombies.length) return;
                    console.log("[Guest] Spawning wave bundle of size:", data.zombies.length);
                    const htmlBuffer = [];
                    const zombieObjs = [];

                    data.zombies.forEach((item, idx) => {
                        const Unit = window[item.unit];
                        if (Unit) {
                            let z = new Unit();
                            z.id = item.id;
                            z.R = item.row;
                            var g = GetY(item.row) + z.GetDY();
                            var top = g - z.height;
                            var zIndex = 3 * item.row + 1;
                            z.pixelTop = top;
                            z.zIndex = zIndex;
                            z.delayT = item.delay || 0;
                            if (z.delayT > 0) z.FreeSetbodyTime = oSym.Now;

                            let x = z.X || 1000;
                            let html = z.getHTML(item.id, x, top, zIndex, "none", "auto", z.GetDTop, z.PicArr[z.NormalGif]);

                            zombieObjs.push(z);
                            htmlBuffer.push(html);
                        }
                    });

                    asyncInnerHTML(
                        htmlBuffer.join(""),
                        (fragment, list) => {
                            EDPZ.appendChild(fragment);
                            let i = list.length;
                            while (i--) {
                                list[i].Birth();
                            }
                            console.log("[Guest] Wave zombies successfully birthed on lawn!");
                        },
                        zombieObjs
                    );
                }
            } catch (err) {
                console.error("[Co-op Sync Error]", err);
            }
        };
    }

    function broadcastSun() {
        innerText(ESSunNum, oS.SunNum);
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: "SET_BANK_SUN", sun: oS.SunNum }));
        }
    }

    const originalSelectCard = window.SelectCard;
    window.SelectCard = function (name, retry, playTap) {
        const isSelecting = !ArPCard[name] || !ArPCard[name].Select;
        originalSelectCard(name, retry, playTap);
        if (name !== "oSunFlower" && socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: isSelecting ? "DRAFT_CLAIM" : "DRAFT_RELEASE", plant: name, player: playerNum }));
        }
    };

    setTimeout(() => {
        if (typeof SelectCard === "function") {
            SelectCard("oSunFlower", 0, false);
        }
    }, 400);

    setTimeout(() => {
        const btnOK = $("btnOK");
        if (btnOK) {
            btnOK.onclick = function () {
                PlaySound2("tap");
                btnOK.disabled = "disabled";
                btnOK.style.color = "#888";
                btnOK.value = "WAITING...";
                if (socket && socket.readyState === 1) {
                    socket.send(JSON.stringify({ type: "READY_ROCK" }));
                }
            };
        }
    }, 600);

    window.originalCoopGrow = GrowPlant;
    GrowPlant = function (plants, c, r, rType, cType) {
        const cardIdx = oS.ChoseCard;
        const card = ArCard[cardIdx];
        const UnitClass = card.PName;
        const unitName = UnitClass.prototype.EName;
        const plantCost = UnitClass.prototype.SunNum;
        const res = window.originalCoopGrow(plants, c, r, rType, cType);
        let localPlant = oGd.$[rType + "_" + cType + "_1"];
        if (localPlant) localPlant.owner = playerNum;

        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: "REMOTE_PLANT", unit: unitName, c: c, r: r, rType: rType, cType: cType, owner: playerNum }));
            if (isHost) {
                broadcastSun();
            } else {
                socket.send(JSON.stringify({ type: "GUEST_SPEND_SUN", cost: plantCost }));
            }
            if (UnitClass === oSunFlower) {
                socket.send(JSON.stringify({ type: "GLOBAL_COOLDOWN", unit: "oSunFlower", coolTime: 12 }));
            }
        }
        return res;
    };

    window.originalCoopShovel = ShovelPlant;
    ShovelPlant = function (plants, rType, cType) {
        let targetPlant = plants[1];
        if (targetPlant && targetPlant.owner && targetPlant.owner !== playerNum) {
            PlaySound2("buzzer");
            return;
        }
        const res = window.originalCoopShovel(plants, rType, cType);
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: "REMOTE_SHOVEL", row: rType, col: cType }));
        }
        return res;
    };

    window.originalClickSun = ClickSun;
    ClickSun = function (ele) {
        const res = window.originalClickSun(ele);
        if (socket && socket.readyState === 1) {
            if (isHost) {
                oS.SunNum += 25;
                broadcastSun();
            } else {
                socket.send(JSON.stringify({ type: "GUEST_CLICKED_SUN" }));
            }
        }
        return res;
    };

    oSunFlower.prototype.SunNum = 75;
    oSunFlower.prototype.coolTime = 12;

    const availablePlants = [oSunFlower, oPeashooter, oSnowPea, oRepeater, oWallNut, oTorchwood, oSquash, oCherryBomb, oChomper, oPotatoMine];

    oS.Init(
        {
            PName: availablePlants,
            ZName: [oZombie, oConeheadZombie, oBucketheadZombie, oFootballZombie, oPoleVaultingZombie],
            PicArr: ["images/interface/background1.jpg"],
            backgroundImage: "images/interface/background1.jpg",
            ShowScroll: true,
            CanSelectCard: 1,
            SunNum: 300,
            ProduceSun: isHost,
            LargeWaveFlag: { 10: $("imgFlag1") },
            LevelName: "Co-op Survival - Room: " + roomCode + " (Player " + playerNum + ")",
            StartGameMusic: "Grasswalk",
            InitLawnMower() {
                var a = 6;
                while (--a) CustomSpecial(oLawnCleaner, a, -1);
            },
            StartGame() {
                StopMusic();
                PlayMusic((oS.LoadMusic = oS.StartGameMusic));
                SetVisible($("dFlagMeter"), $("dTop"));
                SetVisible($("dFlagMeterContent"));
                oS.InitLawnMower();

                if (isHost && oP && !oP._hooked) {
                    oP._hooked = true;
                    const origSetTimeoutZombie = oP.SetTimeoutZombie;
                    oP.SetTimeoutZombie = function (zombieList, delay) {
                        const htmlBuffer = [];
                        const zombieObjs = [];
                        const waveBundle = [];
                        let idx = 0;
                        let timeOffset = 0;
                        const len = zombieList.length;

                        while (idx < len) {
                            const zombie = new zombieList[idx]();
                            htmlBuffer[idx] = zombie.prepareBirth(timeOffset);
                            zombieObjs[idx] = zombie;
                            waveBundle.push({
                                unit: zombie.EName || (zombie.constructor && zombie.constructor.prototype && zombie.constructor.prototype.EName) || "oZombie",
                                row: zombie.R, // THE EXACT ENGINE-ROLLED ROW!
                                delay: timeOffset,
                                id: zombie.id
                            });
                            timeOffset += delay;
                            ++idx;
                        }

                        asyncInnerHTML(
                            htmlBuffer.join(""),
                            (fragment, list) => {
                                EDPZ.appendChild(fragment);
                                let i = list.length;
                                while (i--) {
                                    list[i].Birth();
                                }
                            },
                            zombieObjs
                        );

                        console.log("[Host] Sending WAVE_BUNDLE_EXACT with zombies:", waveBundle);
                        if (socket && socket.readyState === 1) {
                            socket.send(JSON.stringify({
                                type: "WAVE_BUNDLE_EXACT",
                                zombies: waveBundle
                            }));
                        }
                        return;
                    };
                }

                PrepareGrowPlants(() => {
                    oP.Monitor();
                    BeginCool();
                    if (isHost) {
                        AutoProduceSun(50);
                        oSym.addTask(200, () => { oP.AddZombiesFlag(); }, []);
                    }
                });
            }
        },
        {
            AZ: [[oZombie, 4, 1], [oConeheadZombie, 3, 2], [oPoleVaultingZombie, 2, 2], [oBucketheadZombie, 2, 3], [oFootballZombie, 1, 4]],
            FlagNum: 10,
            FlagToSumNum: { a1: [3, 5, 8, 10], a2: [1, 2, 3, 5] },
            FlagToMonitor: { 9: [ShowFinalWave, 0] },
            FlagToEnd() {
                oP.FlagNum += 10;
                oP.AZ.push([oBucketheadZombie, 2, 2], [oFootballZombie, 1, 3]);
                oP.ReadyFlag = oP.FlagZombies;
                PlaySound2("awooga");
                oSym.addTask(100, oP.FlagPrgs, []);
            }
        }
    );
})();
