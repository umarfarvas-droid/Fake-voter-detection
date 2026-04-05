/**
 * Fake Voters Detection System — page behavior
 * Mobile menu, smooth scroll offset, form validation, QR scanner, scroll animations
 */

(function () {
  "use strict";

  // ---------- DOM references ----------
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const footerYear = document.getElementById("footerYear");
  const contactForm = document.getElementById("contactForm");

  /** Read fixed header height for scroll offset */
  function getHeaderOffset() {
    const header = document.querySelector(".site-header");
    return header ? header.offsetHeight : 0;
  }

  // ---------- Footer year ----------
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  // ---------- Mobile hamburger menu ----------
  function setMenuOpen(open) {
    if (!navbar || !navToggle) return;
    navbar.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function toggleMenu() {
    const open = !navbar.classList.contains("nav-open");
    setMenuOpen(open);
  }

  if (navToggle && navbar) {
    navToggle.addEventListener("click", toggleMenu);
  }

  /** Close menu when a nav link is activated (mobile) */
  function closeMenuOnNavClick() {
    if (!navMenu) return;
    navMenu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });
  }
  closeMenuOnNavClick();

  /** Close menu when clicking outside navbar */
  document.addEventListener("click", function (e) {
    if (!navbar || !navToggle) return;
    if (!navbar.classList.contains("nav-open")) return;
    if (navbar.contains(e.target)) return;
    setMenuOpen(false);
  });

  // ---------- Smooth scrolling with fixed header offset ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const id = this.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const top =
        target.getBoundingClientRect().top +
        window.scrollY -
        getHeaderOffset();

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    });
  });

  // ---------- Contact form validation ----------
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function markInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle("invalid", invalid);
  }

  function validateContactForm() {
    const nameInput = document.getElementById("contactName");
    const emailInput = document.getElementById("contactEmail");
    const messageInput = document.getElementById("contactMessage");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const message = messageInput ? messageInput.value.trim() : "";

    markInvalid(nameInput, false);
    markInvalid(emailInput, false);
    markInvalid(messageInput, false);

    if (!name) {
      alert("Please enter your name.");
      markInvalid(nameInput, true);
      if (nameInput) nameInput.focus();
      return false;
    }

    if (!email) {
      alert("Please enter your email address.");
      markInvalid(emailInput, true);
      if (emailInput) emailInput.focus();
      return false;
    }

    if (!emailPattern.test(email)) {
      alert("Please enter a valid email address.");
      markInvalid(emailInput, true);
      if (emailInput) emailInput.focus();
      return false;
    }

    if (!message) {
      alert("Please enter a message.");
      markInvalid(messageInput, true);
      if (messageInput) messageInput.focus();
      return false;
    }

    return true;
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateContactForm()) return;

      alert("Thank you! Your message has been submitted.");
      contactForm.reset();
      document.querySelectorAll(".contact-form .invalid").forEach(function (el) {
        el.classList.remove("invalid");
      });
    });
  }

  // ---------- Voter registry (localStorage + QR generation) ----------
  const STORAGE_KEY = "fvds_voters";
  const QR_PAYLOAD_VERSION = 1;

  function newVoterId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function loadVoters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("FVDS: could not load voters", err);
      return [];
    }
  }

  function saveVoters(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn("FVDS: could not save voters", err);
      alert("Could not save data. Storage may be full or disabled.");
    }
  }

  function maskIdNumber(num) {
    const s = String(num || "").trim();
    if (s.length <= 4) return "••••";
    return "••••" + s.slice(-4);
  }

  function formatRegistryDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return iso;
    }
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function setRegistryMsg(text, isError) {
    const el = document.getElementById("registryFormMsg");
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      el.classList.remove("registry-form-msg--error");
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle("registry-form-msg--error", !!isError);
  }

  function clearRegistryQrPreview() {
    const canvas = document.getElementById("registryQrCanvas");
    const placeholder = document.getElementById("registryQrPlaceholder");
    const dl = document.getElementById("btnRegistryDownload");
    if (canvas) {
      canvas.hidden = true;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (placeholder) placeholder.hidden = false;
    if (dl) {
      dl.hidden = true;
      dl.removeAttribute("href");
    }
  }

  function showRegistryQr(payload) {
    if (typeof QRCode === "undefined") {
      setRegistryMsg("QR library did not load. Refresh the page.", true);
      return;
    }
    const canvas = document.getElementById("registryQrCanvas");
    const placeholder = document.getElementById("registryQrPlaceholder");
    const dl = document.getElementById("btnRegistryDownload");
    if (!canvas) return;

    QRCode.toCanvas(
      canvas,
      payload,
      {
        width: 220,
        margin: 2,
        color: { dark: "#0d47a1", light: "#ffffff" },
      },
      function (err) {
        if (err) {
          console.error(err);
          setRegistryMsg("Could not generate QR.", true);
          return;
        }
        if (placeholder) placeholder.hidden = true;
        canvas.hidden = false;

        QRCode.toDataURL(
          payload,
          {
            width: 320,
            margin: 2,
            color: { dark: "#0d47a1", light: "#ffffff" },
          },
          function (err2, url) {
            if (!dl || err2 || !url) return;
            dl.href = url;
            dl.hidden = false;
          }
        );
      }
    );
  }

  function renderVoterTable() {
    const tbody = document.getElementById("registryTableBody");
    const emptyEl = document.getElementById("registryEmpty");
    const table = document.getElementById("registryTable");
    if (!tbody) return;

    const voters = loadVoters();
    tbody.innerHTML = "";

    voters.forEach(function (v) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(v.fullName) +
        "</td><td>" +
        escapeHtml(v.idProofType) +
        "</td><td>" +
        escapeHtml(maskIdNumber(v.idProofNumber)) +
        "</td><td>" +
        escapeHtml(v.phone || "—") +
        "</td><td>" +
        (v.faceIdEnrolled ? "Yes" : "No") +
        "</td><td>" +
        (v.fingerprintEnrolled ? "Yes" : "No") +
        "</td><td>" +
        escapeHtml(formatRegistryDate(v.createdAt)) +
        "</td><td>" +
        (v.hasVoted ? "Yes" : "No") +
        '</td><td><button type="button" class="btn-registry-delete" data-voter-id="' +
        escapeAttr(v.id) +
        '">Delete</button></td>';
      tbody.appendChild(tr);
    });

    const hasRows = voters.length > 0;
    if (emptyEl) emptyEl.hidden = hasRows;
    if (table) table.hidden = !hasRows;
  }

  function handleRegistrySubmit(e) {
    e.preventDefault();
    setRegistryMsg("");

    const nameEl = document.getElementById("registryFullName");
    const typeEl = document.getElementById("registryIdType");
    const numEl = document.getElementById("registryIdNumber");
    const phoneEl = document.getElementById("registryPhone");
    const faceEl = document.getElementById("registryFaceId");
    const fpEl = document.getElementById("registryFingerprint");

    const nameTrim = nameEl ? nameEl.value.trim() : "";
    const idType = typeEl ? typeEl.value : "";
    const idNumTrim = numEl ? numEl.value.trim() : "";
    const phoneTrim = phoneEl ? phoneEl.value.trim() : "";

    if (!nameTrim) {
      setRegistryMsg("Please enter full name.", true);
      return;
    }
    if (!idType) {
      setRegistryMsg("Please select ID proof type.", true);
      return;
    }
    if (!idNumTrim) {
      setRegistryMsg("Please enter ID proof number.", true);
      return;
    }

    const voter = {
      id: newVoterId(),
      fullName: nameTrim,
      idProofType: idType,
      idProofNumber: idNumTrim,
      phone: phoneTrim || null,
      faceIdEnrolled: !!(faceEl && faceEl.checked),
      fingerprintEnrolled: !!(fpEl && fpEl.checked),
      createdAt: new Date().toISOString(),
      hasVoted: false,
    };

    const list = loadVoters();
    list.push(voter);
    saveVoters(list);

    const payload = JSON.stringify({ v: QR_PAYLOAD_VERSION, id: voter.id });
    showRegistryQr(payload);
    renderVoterTable();
    setRegistryMsg("Voter saved. QR code is ready to scan or download.");

    const form = document.getElementById("registryForm");
    if (form) form.reset();
  }

  function handleRegistryClear() {
    const form = document.getElementById("registryForm");
    if (form) form.reset();
    setRegistryMsg("");
    clearRegistryQrPreview();
  }

  function handleRegistryTableClick(e) {
    const btn = e.target.closest(".btn-registry-delete");
    if (!btn) return;
    const id = btn.getAttribute("data-voter-id");
    if (!id) return;
    const list = loadVoters().filter(function (v) {
      return v.id !== id;
    });
    saveVoters(list);
    renderVoterTable();
    clearRegistryQrPreview();
    setRegistryMsg("Voter removed from registry.");
  }

  (function initRegistry() {
    const form = document.getElementById("registryForm");
    if (form) form.addEventListener("submit", handleRegistrySubmit);
    const clearBtn = document.getElementById("btnRegistryClear");
    if (clearBtn) clearBtn.addEventListener("click", handleRegistryClear);
    const table = document.getElementById("registryTable");
    if (table) table.addEventListener("click", handleRegistryTableClick);
    const dl = document.getElementById("btnRegistryDownload");
    if (dl) {
      dl.addEventListener("click", function (e) {
        const h = dl.getAttribute("href");
        if (!h || h === "#") {
          e.preventDefault();
        }
      });
    }
    renderVoterTable();
  })();

  // ---------- QR Code voter verification (html5-qrcode) ----------
  let html5QrCode = null;
  let qrScanning = false;

  function qrEls() {
    return {
      reader: document.getElementById("qr-reader"),
      startBtn: document.getElementById("btnStartScanner"),
      stopBtn: document.getElementById("btnStopScanner"),
      loading: document.getElementById("qrLoading"),
      result: document.getElementById("qrResult"),
      error: document.getElementById("qrError"),
    };
  }

  function setQrErrorMessage(msg) {
    const el = qrEls().error;
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function setScanningUI(isActive) {
    const q = qrEls();
    if (q.startBtn) q.startBtn.disabled = isActive;
    if (q.stopBtn) q.stopBtn.disabled = !isActive;
    if (q.loading) q.loading.hidden = !isActive;
  }

  function showQrOutcome(kind, text) {
    const r = qrEls().result;
    if (!r) return;
    r.hidden = false;
    r.className = "qr-result qr-result--" + kind;
    r.textContent = text;
  }

  function clearQrOutcome() {
    const r = qrEls().result;
    if (!r) return;
    r.hidden = true;
    r.textContent = "";
    r.className = "qr-result";
  }

  function stopScanner() {
    if (!html5QrCode || !qrScanning) {
      qrScanning = false;
      setScanningUI(false);
      return Promise.resolve();
    }
    return html5QrCode
      .stop()
      .then(function () {
        html5QrCode.clear();
      })
      .catch(function (err) {
        console.warn("QR scanner stop:", err);
      })
      .then(function () {
        qrScanning = false;
        setScanningUI(false);
      });
  }

  function applyVerification(decodedText) {
    const raw = (decodedText || "").trim();
    if (!raw) {
      showQrOutcome("invalid", "❌ Invalid QR — empty code.");
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      showQrOutcome("invalid", "❌ Invalid QR — not a registered voter code.");
      return;
    }

    if (
      !data ||
      data.v !== QR_PAYLOAD_VERSION ||
      typeof data.id !== "string" ||
      !data.id
    ) {
      showQrOutcome("invalid", "❌ Invalid QR — wrong format or unknown version.");
      return;
    }

    const voters = loadVoters();
    const idx = voters.findIndex(function (v) {
      return v.id === data.id;
    });
    if (idx === -1) {
      showQrOutcome("invalid", "❌ Invalid QR — voter not in this registry.");
      return;
    }

    const voter = voters[idx];
    if (voter.hasVoted) {
      showQrOutcome(
        "duplicate",
        "⚠️ Duplicate voter — " + voter.fullName + " already verified."
      );
      return;
    }

    voter.hasVoted = true;
    voters[idx] = voter;
    saveVoters(voters);
    renderVoterTable();

    const bioParts = [];
    if (voter.faceIdEnrolled) bioParts.push("Face ID");
    if (voter.fingerprintEnrolled) bioParts.push("Fingerprint");
    const bioSuffix =
      bioParts.length > 0 ? " (" + bioParts.join(", ") + " on file)" : "";

    showQrOutcome("valid", "✅ Verified voter — " + voter.fullName + bioSuffix);
  }

  function startScanner() {
    setQrErrorMessage("");
    clearQrOutcome();

    if (typeof Html5Qrcode === "undefined") {
      setQrErrorMessage(
        "QR scanner library did not load. Check your connection and refresh the page."
      );
      return;
    }

    if (qrScanning) {
      return;
    }

    const readerId = "qr-reader";
    const q = qrEls();
    if (!q.reader) return;

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode(readerId);
    }

    const config = {
      fps: 10,
      qrbox: function (vw, vh) {
        const edge = Math.min(vw, vh);
        const box = Math.floor(edge * 0.72);
        return { width: box, height: box };
      },
    };

    qrScanning = true;
    setScanningUI(true);

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        function (decodedText) {
          stopScanner().then(function () {
            applyVerification(decodedText);
          });
        },
        function () {
          /* No QR in frame yet — ignore per-frame errors */
        }
      )
      .catch(function (err) {
        qrScanning = false;
        setScanningUI(false);
        const msg = err && err.message ? String(err.message) : String(err);
        if (/Permission|NotAllowed|Denied/i.test(msg)) {
          setQrErrorMessage(
            "Camera access was denied. Allow the camera in your browser settings, then try again."
          );
        } else if (/NotFound|No devices/i.test(msg)) {
          setQrErrorMessage("No usable camera was found on this device.");
        } else {
          setQrErrorMessage(
            "Could not start the camera scanner. " +
              (msg || "Try Stop Scanner, then Start again.")
          );
        }
        html5QrCode = null;
        if (q.reader) {
          q.reader.innerHTML = "";
        }
      });
  }

  (function initQrScannerUi() {
    const q = qrEls();
    if (q.startBtn) {
      q.startBtn.addEventListener("click", startScanner);
    }
    if (q.stopBtn) {
      q.stopBtn.addEventListener("click", function () {
        stopScanner().then(function () {
          clearQrOutcome();
          setQrErrorMessage("");
        });
      });
    }
  })();

  // ---------- WebAuthn (device biometrics — demo, no backend) ----------
  const WEBAUTHN_STORAGE_KEY = "fvds_webauthn_demo";

  /** Secure context + browser API present (HTTPS or localhost). */
  function isWebAuthnAvailable() {
    return !!(window.isSecureContext && window.PublicKeyCredential);
  }

  /** Relying party id must match the current host. */
  function getWebAuthnRpId() {
    return window.location.hostname || "localhost";
  }

  /** Cryptographically random bytes for challenge and user handle. */
  function webAuthnRandomBytes(length) {
    const out = new Uint8Array(length);
    crypto.getRandomValues(out);
    return out;
  }

  /** Encode ArrayBuffer or Uint8Array as base64url (for localStorage). */
  function bufferToBase64url(buf) {
    let bytes;
    if (buf instanceof Uint8Array) {
      bytes = buf;
    } else {
      bytes = new Uint8Array(buf);
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /** Decode base64url to ArrayBuffer for allowCredentials.id */
  function base64urlToBuffer(base64url) {
    const pad = base64url.length % 4;
    const padded =
      base64url + (pad === 0 ? "" : pad === 2 ? "==" : pad === 3 ? "=" : "");
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function loadWebAuthnState() {
    try {
      const raw = localStorage.getItem(WEBAUTHN_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.credentialIdBase64url !== "string") {
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveWebAuthnState(state) {
    try {
      localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("FVDS: WebAuthn state save failed", e);
    }
  }

  function clearWebAuthnResultEl() {
    const el = document.getElementById("webauthnResult");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.className = "webauthn-result";
  }

  function showWebAuthnOutcome(success, message) {
    const el = document.getElementById("webauthnResult");
    if (!el) return;
    el.hidden = false;
    el.className =
      "webauthn-result " +
      (success ? "webauthn-result--success" : "webauthn-result--fail");
    el.textContent = message;
  }

  function webAuthnFriendlyError(err) {
    const name = err && err.name ? err.name : "";
    const msg = err && err.message ? String(err.message) : "";
    if (name === "NotAllowedError") {
      return "You cancelled or the request was not allowed.";
    }
    if (name === "InvalidStateError") {
      return "Authenticator is not available or already in use.";
    }
    if (name === "SecurityError") {
      return "Security blocked the request (use HTTPS or localhost).";
    }
    if (name === "TimeoutError" || /timeout/i.test(msg)) {
      return "The operation timed out.";
    }
    if (name === "NotSupportedError") {
      return "This device or browser does not support this authenticator.";
    }
    return msg || "Unknown error.";
  }

  /**
   * Register a new passkey / platform credential.
   * Prefers platform authenticators (fingerprint / face); falls back without attachment if unsupported.
   */
  async function registerWebAuthnCredential() {
    const rpId = getWebAuthnRpId();
    const existing = loadWebAuthnState();
    let userId;
    if (existing && existing.userIdBase64url) {
      userId = new Uint8Array(base64urlToBuffer(existing.userIdBase64url));
    } else {
      userId = webAuthnRandomBytes(16);
    }

    const tryCreate = function (platformOnly) {
      const challenge = webAuthnRandomBytes(32);
      const authenticatorSelection = {
        userVerification: "required",
      };
      if (platformOnly) {
        authenticatorSelection.authenticatorAttachment = "platform";
      }

      return navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Fake Voters Detection System",
            id: rpId,
          },
          user: {
            id: userId,
            name: "voter-demo@fvds.local",
            displayName: "Demo Voter",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: authenticatorSelection,
          timeout: 60000,
          attestation: "none",
        },
      });
    };

    let credential;
    try {
      credential = await tryCreate(true);
    } catch (firstErr) {
      if (firstErr && firstErr.name === "NotSupportedError") {
        credential = await tryCreate(false);
      } else {
        throw firstErr;
      }
    }

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("Unexpected credential type");
    }

    saveWebAuthnState({
      credentialIdBase64url: bufferToBase64url(credential.rawId),
      userIdBase64url: bufferToBase64url(userId),
      registeredAt: new Date().toISOString(),
    });

    return credential;
  }

  /** Verify with stored credential id (userVerification required). */
  async function authenticateWebAuthn() {
    const state = loadWebAuthnState();
    if (!state || !state.credentialIdBase64url) {
      throw new Error("No stored credential");
    }

    const rpId = getWebAuthnRpId();
    const challenge = webAuthnRandomBytes(32);
    const credId = base64urlToBuffer(state.credentialIdBase64url);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: rpId,
        allowCredentials: [
          {
            type: "public-key",
            id: credId,
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      throw new Error("No credential returned");
    }

    return assertion;
  }

  function onWebAuthnButtonClick() {
    const btn = document.getElementById("btnWebAuthnVerify");
    const loading = document.getElementById("webauthnLoading");
    if (!btn) return;

    clearWebAuthnResultEl();

    if (!isWebAuthnAvailable()) {
      showWebAuthnOutcome(
        false,
        "❌ Verification Failed — WebAuthn is not available. Use HTTPS or localhost and a modern browser."
      );
      return;
    }

    btn.disabled = true;
    if (loading) loading.hidden = false;

    (async function () {
      try {
        if (
          typeof PublicKeyCredential
            .isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ) {
          const uvpa =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (!uvpa) {
            console.warn(
              "FVDS: No user-verifying platform authenticator reported; WebAuthn may still work with security keys."
            );
          }
        }

        const state = loadWebAuthnState();
        if (!state || !state.credentialIdBase64url) {
          await registerWebAuthnCredential();
          showWebAuthnOutcome(
            true,
            "✅ Registered for this device — tap again to verify with biometrics."
          );
        } else {
          await authenticateWebAuthn();
          showWebAuthnOutcome(true, "✅ Biometric Verified");
        }
      } catch (err) {
        console.warn("WebAuthn:", err);
        const detail = webAuthnFriendlyError(err);
        showWebAuthnOutcome(
          false,
          "❌ Verification Failed — " + detail
        );
      } finally {
        if (loading) loading.hidden = true;
        btn.disabled = false;
      }
    })();
  }

  (function initWebAuthnUi() {
    const btn = document.getElementById("btnWebAuthnVerify");
    if (btn) {
      btn.addEventListener("click", onWebAuthnButtonClick);
    }
  })();

  // ---------- Scroll-triggered fade-in (Intersection Observer) ----------
  const fadeElements = document.querySelectorAll(".fade-in-section");

  if (fadeElements.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show content if observer unsupported
    fadeElements.forEach(function (el) {
      el.classList.add("visible");
    });
  }
})();
