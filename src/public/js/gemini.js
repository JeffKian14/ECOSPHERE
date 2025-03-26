// Secure API Key (Store it securely, don't expose publicly)
const API_KEY = "AIzaSyDoSgt53bNbO6Rlqs0QMJjCr9zHofxLtwA"; // Replace with a secure environment variable
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

const token = localStorage.getItem("token") || "";

let currentHouseId = null;

async function initCurrentHouseAndRender() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first.");
        return;
    }

    try {
        const res = await fetch("/api/user/houses", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        const houses = data.houses || [];

        if (houses.length === 0) {
            alert("You don't have any house yet.");
            return;
        }

        currentHouseId = houses[0]._id;

        const houseSelector = document.getElementById("houseSelector");
        if (houseSelector) {
            houseSelector.innerHTML = "";
            houses.forEach(h => {
                const option = document.createElement("option");
                option.value = h._id;
                option.textContent = h.house_name;
                houseSelector.appendChild(option);
            });
            houseSelector.value = currentHouseId;
            houseSelector.addEventListener("change", () => {
                currentHouseId = houseSelector.value;
                renderRooms();
                loadAndRenderDevices();
            });
        }

        renderRooms();
        loadAndRenderDevices();

    } catch (error) {
        console.error("[ERROR] initCurrentHouseAndRender ->", error);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    initCurrentHouseAndRender().then(r => console.log("Initialized current house and rendered."));
});
// Fetch AI Response from Gemini API
async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (data?.candidates?.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "No enough data to generate report.";
        }
    } catch (error) {
        console.error("Error:", error);
        return "Error fetching response.";
    }
}

// Device Control
function updateDeviceTemperature(deviceId, newTemperature) {
    fetch("/api/update-temperature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId, temperature: newTemperature })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error("Failed to update device temperature:", data.message);
            } else {
                console.log(`[INFO] Updated ${deviceName} temperature to ${newTemperature}°C`);
            }
        })
        .catch(error => console.error("Error updating device temperature:", error));
}


document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const houseSelector = document.getElementById("houseSelectorForStatus");
    const deviceList = document.getElementById("deviceList");

    async function fetchUserHouses() {
        const res = await fetch("/api/user/houses", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.houses || [];
    }

    async function loadDevicesByHouse(houseId) {
        const res = await fetch(`/api/houses/${houseId}/devices`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.devices || [];
    }

    async function renderHouseOptions() {
        const houses = await fetchUserHouses();
        houseSelector.innerHTML = "";
        houses.forEach(h => {
            const option = document.createElement("option");
            option.value = h._id;
            option.textContent = h.house_name;
            houseSelector.appendChild(option);
        });
        if (houses.length > 0) {
            houseSelector.value = houses[0]._id;
            loadAndRenderDevices(houses[0]._id);
        }
    }

    async function loadAndRenderDevices(houseId) {
        const devices = await loadDevicesByHouse(houseId);
        const deviceList = document.getElementById("deviceList");
        if (!deviceList) return;

        deviceList.innerHTML = "";

        devices.forEach(device => {
            const deviceItem = document.createElement("div");
            deviceItem.classList.add("hBar");

            const nameContainer = document.createElement("div");
            nameContainer.style.display = "flex";
            nameContainer.style.flexDirection = "column";
            nameContainer.style.justifyContent = "center";
            nameContainer.style.marginRight = "10px";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = device.device_name;

            const roomNameSpan = document.createElement("span");
            roomNameSpan.style.opacity = "0.7";
            roomNameSpan.style.fontSize = "0.8em";
            roomNameSpan.style.marginTop = "2px";
            roomNameSpan.textContent = device.room?.room_name || "Unassigned";

            nameContainer.appendChild(nameSpan);
            nameContainer.appendChild(roomNameSpan);

            const statusBtn = document.createElement("button");
            statusBtn.classList.add("device-status-btn");
            statusBtn.dataset.deviceName = device.device_name;

            updateButtonAppearance(statusBtn, device.status === "true");

            statusBtn.dataset.deviceId = device._id;

            statusBtn.addEventListener("click", function () {
                const currentStatus = device.status === "true" || device.status === true;
                const newStatus = !currentStatus;

                updateDeviceStatus(device._id, newStatus).then(() => {
                    updateButtonAppearance(statusBtn, newStatus);
                    device.status = newStatus.toString();

                    if (device.device_type === "AC") {
                        const tempControls = deviceItem.querySelector(".temperature-control");
                        const tempDisplay = deviceItem.querySelector(".temperature-display");
                        const displayStyle = newStatus ? "flex" : "none";
                        const tempDisplayStyle = newStatus ? "block" : "none";
                        if (tempControls) tempControls.style.display = displayStyle;
                        if (tempDisplay) tempDisplay.style.display = tempDisplayStyle;
                    }
                }).catch(error => {
                    console.error("Error updating device status:", error);
                });
            });
            deviceItem.appendChild(nameContainer);
            deviceItem.appendChild(statusBtn);
            deviceList.appendChild(deviceItem);

            if (device.device_type === "AC") {
                createTempControls(device, deviceItem);
            }
        });
    }

    function createTempControls(device, deviceItem) {
        const tempControlContainer = document.createElement("div");
        tempControlContainer.classList.add("temperature-control");
        tempControlContainer.style.display = device.status === "true" ? "flex" : "none";

        const tempDisplay = document.createElement("div");
        tempDisplay.classList.add("temperature-display");
        tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
        tempDisplay.style.display = device.status === "true" ? "block" : "none";

        const decreaseBtn = document.createElement("button");
        decreaseBtn.classList.add("temp-btn");
        decreaseBtn.textContent = "−";
        decreaseBtn.addEventListener("click", function () {
            if (device.temperature > 16) {
                device.temperature -= 1;
                updateDeviceTemperature(device.device_name, device.temperature);
                tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
            }
        });

        const increaseBtn = document.createElement("button");
        increaseBtn.classList.add("temp-btn");
        increaseBtn.textContent = "+";
        increaseBtn.addEventListener("click", function () {
            if (device.temperature < 30) {
                device.temperature += 1;
                updateDeviceTemperature(device.device_name, device.temperature);
                tempDisplay.textContent = `${String(device.temperature).padStart(2, ' ')}°C`;
            }
        });

        tempControlContainer.appendChild(decreaseBtn);
        tempControlContainer.appendChild(increaseBtn);
        deviceItem.appendChild(tempDisplay);
        deviceItem.appendChild(tempControlContainer);
    }

    function updateDeviceTemperature(deviceName, newTemperature) {
        fetch("/api/update-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: deviceName, temperature: newTemperature })
        })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error("Failed to update device temperature:", data.message);
                }
            })
            .catch(error => console.error("Error updating device temperature:", error));
    }

    houseSelector.addEventListener("change", function () {
        currentHouseId = this.value;
        loadAndRenderDevices(currentHouseId);
        renderRooms(currentHouseId);
    });

    await renderHouseOptions();
});


function updateButtonAppearance(button, isOn) {
    if (isOn) {
        button.classList.add("device-status-on");
        button.classList.remove("device-status-off");
        button.textContent = "ON";
    } else {
        button.classList.add("device-status-off");
        button.classList.remove("device-status-on");
        button.textContent = "OFF";
    }
}



function updateDeviceStatus(deviceId, newStatus) {
    return fetch("/api/update-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId, status: newStatus })
    })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message);
            }
        });
}

function updateDeviceStatusByName(deviceName, newStatus) {
    return fetch("/api/update-device-by-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deviceName, status: newStatus })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message);
        });
}



const aiCard = document.querySelector(".aiCard");
// AI Theme & Device Control
function handleGeminiRequest() {
    const userPrompt = document.getElementById("userPrompt").value.trim();
    const responseElement = document.getElementById("apiResponse");

    if (!userPrompt) {
        responseElement.innerText = "Please enter a question.";
        return;
    }

    const fullPrompt = `
You are an AI assistant. Follow these instructions carefully:
- Do Not generate more than 100 words.
- If the user wants to know the energy usage or reports, reply with "reportPage."
- If the user wants to set profile settings or edit passward / email or log out, reply with "settingsPage."
- If the user wants to add or delete a device, reply with "devicePage".
- If the user's message wants to change to a specific theme mode, reply only with "Ok, changed to"+light/dark/black+theme.
- If the message does not, respond normally.
- If the message wants to know what you can do/who are you, reply with "I am ECOSPHERE AI, I can help you with energy reports, change settings, and more.".
- if want to turn on or off devices, reply with "Ok, turned on/off the "+devicename.
- If the user wants to switch/see another house, reply with "here are the houses you have, which one do you want to switch to?".
User Input: "${userPrompt}"
AI Response:`;

    responseElement.innerText = "Fetching response...";
    fetchGeminiResponse(fullPrompt).then(responseText => {
        aiCard.style.height = "auto";
        const aiResponseText = responseText;
        responseElement.innerText = "";
        typeTextEffect(responseElement, aiResponseText, 50, aiCard);

        // AI Device Control
        const deviceActionMatch = aiResponseText.match(/Ok,\s*turned\s*(on|off)\s*the\s*([a-zA-Z0-9\s]+)/i);
        if (deviceActionMatch) {
            const action = deviceActionMatch[1].toLowerCase();
            const deviceNameFromAI = deviceActionMatch[2].trim();

            fetch("/api/devices")
                .then(res => res.json())
                .then(devices => {
                    const matchedDevice = devices.find(d => d.device_name.toLowerCase() === deviceNameFromAI.toLowerCase());

                    if (matchedDevice) {
                        const status = action === "on";
                        updateDeviceStatusByName(matchedDevice.device_name, status).then(() => {
                            console.log("Device status updated successfully.");
                            refreshButtonStatus(matchedDevice.device_name, status);
                        }).catch(err => {
                            console.error("Error updating device status:", err);
                        });
                    } else {
                        console.error("No matching device found:", deviceNameFromAI);
                    }
                }).catch(err => {
                console.error("Error fetching devices:", err);
            });
        }

        // AI Temperature Control
        const tempMatch = aiResponseText.match(/Set\s*([a-zA-Z0-9\s]+)\s*to\s*(\d+)°C/i);
        if (tempMatch) {
            const deviceNameFromAI = tempMatch[1].trim().toLowerCase();
            const temperature = parseInt(tempMatch[2]);

            fetch("/api/devices")
                .then(res => res.json())
                .then(devices => {
                    const matchedDevice = devices.find(d => d.device_name.toLowerCase() === deviceNameFromAI && d.device_type === "AC");
                    if (matchedDevice) {
                        updateDeviceTemperature(device._id, temperature).then(() => {
                            console.log("Temperature updated successfully.");
                            refreshTemperatureDisplay(matchedDevice.device_name, temperature);
                        });
                    } else {
                        console.error("No matching AC device found:", deviceNameFromAI);
                    }
                }).catch(err => console.error("Error fetching devices:", err));
        }

        // AI theme control, pages
        if (aiResponseText.includes("Ok, changed to dark theme")) switchTheme("dark-theme");
        else if (aiResponseText.includes("Ok, changed to black theme")) switchTheme("black-theme");
        else if (aiResponseText.includes("Ok, changed to light theme")) switchTheme("light-theme");

        if (aiResponseText.toLowerCase().includes("to switch to")) {
            fetch("/api/user/houses", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.houses && data.houses.length > 0) {
                        showHouseSwitchModal(data.houses);
                    }
                })
                .catch(err => console.error("Failed to fetch houses for switch:", err));
        }
        if (aiResponseText.includes("reportPage")) window.location.href = "../pages/reportPage.html";
        if (aiResponseText.includes("settingsPage")) window.location.href = "../pages/settingPage.html";
        if (aiResponseText.includes("devicePage")) window.location.href = "../pages/devicesPage.html";
    });
}

function refreshButtonStatus(deviceName, isOn) {
    const buttons = document.querySelectorAll(".device-status-btn");
    buttons.forEach(btn => {
        if (btn.dataset.deviceName === deviceName) {
            btn.textContent = isOn ? "ON" : "OFF";
            btn.classList.toggle("device-status-on", isOn);
            btn.classList.toggle("device-status-off", !isOn);

            const deviceItem = btn.parentElement;
            const tempControl = deviceItem.querySelector(".temperature-control");
            const tempDisplay = deviceItem.querySelector(".temperature-display");
            if (tempControl) tempControl.style.display = isOn ? "flex" : "none";
            if (tempDisplay) tempDisplay.style.display = isOn ? "block" : "none";
        }
    });
}


function refreshTemperatureDisplay(deviceName, newTemperature) {
    const buttons = document.querySelectorAll(".device-status-btn");
    buttons.forEach(btn => {
        if (btn.dataset.deviceName === deviceName) {
            const deviceItem = btn.parentElement;
            const tempDisplay = deviceItem.querySelector(".temperature-display");
            if (tempDisplay) tempDisplay.textContent = `${String(newTemperature).padStart(2, ' ')}°C`;
        }
    });
}



// Typing Effect
function typeTextEffect(element, text, speed) {
    let i = 0;
    element.innerHTML = "";
    element.style.opacity = "1";

    function type() {
        if (i < text.length) {
            let span = document.createElement("span");
            span.textContent = text.charAt(i);
            span.style.opacity = "0";
            span.style.transition = "opacity 0.2s ease, font-size 0.2s ease";
            span.style.fontSize = "1.5em";
            span.style.fontFamily = '"Arial", sans-serif';

            element.appendChild(span);
            setTimeout(() => {
                span.style.opacity = "1";
                span.style.fontSize = "1.2em";
            }, 1);

            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// Theme Switching
function switchTheme(theme) {
    const rootElement = document.documentElement;
    rootElement.classList.remove("light-theme", "dark-theme", "black-theme");

    if (theme !== "light-theme") {
        rootElement.classList.add(theme);
    }

    localStorage.setItem("selectedTheme", theme);
    console.log(`🎨 Theme switched to: ${theme}`);
}

window.switchTheme = switchTheme;

// AI Theme Commands
function handleAICommand(command) {
    const lowerCaseCommand = command.toLowerCase();
    let newTheme = null;

    if (lowerCaseCommand.includes("dark mode")) {
        newTheme = "dark-theme";
    } else if (lowerCaseCommand.includes("black mode")) {
        newTheme = "black-theme";
    } else if (lowerCaseCommand.includes("light mode")) {
        newTheme = "light-theme";
    }

    if (newTheme) {
        switchTheme(newTheme);
        console.log(`AI switched theme to: ${newTheme}`);
    }
}

window.handleAICommand = handleAICommand;

// Hide AI Response on Click Outside
window.onload = function () {
    document.addEventListener("click", function (event) {
        const aiCard = document.querySelector(".aiCard");
        const responseElement = document.getElementById("apiResponse");

        if (!aiCard.contains(event.target)) {
            aiCard.style.height = "8vh";
            responseElement.innerText = "";
        }
    });

};

// Voice Recognition
document.addEventListener("DOMContentLoaded", function () {
    const inputField = document.getElementById("userPrompt");
    const micButton = document.getElementById("micButton");
    const clearButton = document.getElementById("clearButton");

    clearButton.addEventListener("click", function () {
        inputField.value = "";
        clearButton.style.display = "none";
    });

    inputField.addEventListener("input", function () {
        clearButton.style.display = inputField.value.trim() !== "" ? "inline" : "none";
    });

    micButton.addEventListener("click", function () {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Your browser does not support speech recognition.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";

        recognition.onstart = function () {
            micButton.textContent = "🎙️";
        };

        recognition.onspeechend = function () {
            recognition.stop();
            micButton.textContent = "🎤";
        };

        recognition.onresult = function (event) {
            inputField.value = event.results[0][0].transcript;
            clearButton.style.display = "inline";
        };

        recognition.onerror = function () {
            micButton.textContent = "🎤";
        };

        recognition.start();
    });
});


const searchInput = document.getElementById("userPrompt");
const suggestionList = document.getElementById("suggestionList");

const suggestions = [
    { icon: "../icons/user-id-svgrepo-com.svg", text: "How to change my profile" },
    { icon: "/icons/chart-bar-svgrepo-com.svg", text: "I want to check the energy usage report" },
    { icon: "/icons/setting-3-svgrepo-com.svg", text: "How to change password" },
    { icon: "/icons/setting-3-svgrepo-com.svg", text: "Change to dark mode" },
    { icon: "/icons/setting-3-svgrepo-com.svg", text: "Change to light mode" },
    { icon: "/icons/setting-3-svgrepo-com.svg", text: "Change to black mode" }
];

function filterSuggestions() {
    const userInput = searchInput.value.trim().toLowerCase();
    const filtered = suggestions.filter(item =>
        item.text.toLowerCase().includes(userInput)
    );

    if (!userInput || filtered.length === 0) {
        suggestionList.style.display = "none";
        if (aiCard) {
            aiCard.style.height = "8vh";
        }
        return;
    }

    const limited = filtered.slice(0, 3);
    suggestionList.innerHTML = limited.map(item => `
    <div class="suggestion-item" onclick="selectSuggestion('${item.text}')">
      <div class="ui-menu-icon">
        <img src="${item.icon}" alt="Vector Icon">
      </div>
      <span>${item.text}</span>
    </div>
  `).join("");

    suggestionList.style.display = "block";
    if (aiCard) {
        aiCard.style.height = "26vh";
    }
}

function selectSuggestion(selectedText) {
    searchInput.value = selectedText;
    suggestionList.style.display = "none";
    if (aiCard) {
        aiCard.style.height = "8vh";
    }
}


searchInput.addEventListener("focus", filterSuggestions);
searchInput.addEventListener("input", filterSuggestions);


function showHouseSwitchModal(houses) {
    const modal = document.getElementById("switchHouseModal");
    const select = document.getElementById("houseSwitchSelect");
    select.innerHTML = "";
    houses.forEach(h => {
        const option = document.createElement("option");
        option.value = h._id;
        option.textContent = h.house_name;
        select.appendChild(option);
    });
    modal.style.display = "flex";
}

function closeHouseSwitchModal() {
    document.getElementById("switchHouseModal").style.display = "none";
}

function confirmHouseSwitch() {
    const selectedId = document.getElementById("houseSwitchSelect").value;
    if (selectedId) {
        currentHouseId = selectedId;
        closeHouseSwitchModal();
        renderRooms(currentHouseId).then(r => console.log("Rooms rendered."));
        document.getElementById("houseSelector").value = currentHouseId;
        document.getElementById("houseSelectorForStatus").value = currentHouseId;
        loadAndRenderDevices(currentHouseId).then(r =>  console.log("Devices loaded and rendered."));
    }
}


document.addEventListener("click", function (event) {
    if (
        !searchInput.parentElement.contains(event.target) &&
        !suggestionList.contains(event.target)
    ) {
        suggestionList.style.display = "none";
        if (aiCard) {
            aiCard.style.height = "8vh";
        }
    }
});