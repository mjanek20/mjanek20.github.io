class ARButton {

    static createButton(renderer, sessionInit = {}) {

        const button = document.createElement('button');

        function showStartAR() {

            if (sessionInit.domOverlay === undefined) {

                const overlay = document.createElement('div');
                overlay.style.display = 'none';
                document.body.appendChild(overlay);

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', 38);
                svg.setAttribute('height', 38);
                svg.style.position = 'absolute';
                svg.style.right = '20px';
                svg.style.top = '20px';
                svg.addEventListener('click', function () {

                    currentSession.end();

                });
                overlay.appendChild(svg);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M 12,12 L 28,28 M 28,12 12,28');
                path.setAttribute('stroke', '#fff');
                path.setAttribute('stroke-width', 2);
                svg.appendChild(path);

                if (sessionInit.optionalFeatures === undefined) {
                    sessionInit.optionalFeatures = [];
                }

                sessionInit.optionalFeatures.push('dom-overlay');
                sessionInit.domOverlay = { root: overlay };

            }

            let currentSession = null;

            async function onSessionStarted(session) {

                session.addEventListener('end', onSessionEnded);

                renderer.xr.setReferenceSpaceType('local');

                await renderer.xr.setSession(session);

                button.textContent = 'STOP AR';
                sessionInit.domOverlay.root.style.display = '';

                currentSession = session;

            }

            function onSessionEnded() {

                currentSession.removeEventListener('end', onSessionEnded);

                button.textContent = 'ROOM MESH SAVED';
                sessionInit.domOverlay.root.style.display = 'none';

                currentSession = null;

            }

            button.style.display = 'block';
            button.style.cursor = 'pointer';
            button.style.position = 'fixed';
            button.style.bottom = '40px';
            button.style.left = '50%';
            button.style.transform = 'translateX(-50%)';
            button.style.width = '200px';
            button.style.height = '50px';
            button.style.fontSize = '16px';
            button.style.fontWeight = 'bold';
            button.style.background = '#007bff';
            button.style.color = '#ffffff';
            button.style.border = 'none';
            button.style.borderRadius = '8px';
            button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            button.style.zIndex = '9999';
	    button.textContent = 'DUMP ROOM MESH';

            button.onmouseenter = function () {
                button.style.opacity = '0.9';
            };

            button.onmouseleave = function () {
                button.style.opacity = '1.0';
            };

            button.onclick = function () {
                if (currentSession === null) {
                    navigator.xr.requestSession('immersive-ar', sessionInit).then(onSessionStarted);
                } else {
                    currentSession.end();
                }
            };
        }

        function disableButton() {
            button.style.display = 'block';
            button.style.cursor = 'not-allowed';
            button.textContent = 'AR NOT SUPPORTED';
            button.style.background = '#ff4d4d';
        }

        function showARNotSupported() {
            disableButton();
        }

        function showARNotAllowed(exception) {
            disableButton();
            console.warn('Exception when trying to call xr.isSessionSupported', exception);
            button.textContent = 'AR NOT ALLOWED';
        }

        if ('xr' in navigator) {

            button.id = 'ARButton';

            showStartAR();

            navigator.xr.isSessionSupported('immersive-ar').then(function (supported) {
                if (!supported) showARNotSupported();
            }).catch(showARNotAllowed);

            document.body.appendChild(button);

            return button;

        } else {

            const message = document.createElement('a');

            if (window.isSecureContext === false) {

                message.href = document.location.href.replace(/^http:/, 'https:');
                message.innerHTML = 'WEBXR NEEDS HTTPS';

            } else {

                message.href = 'https://immersiveweb.dev/';
                message.innerHTML = 'WEBXR NOT AVAILABLE';

            }

            message.style.position = 'fixed';
            message.style.bottom = '40px';
            message.style.left = '50%';
            message.style.transform = 'translateX(-50%)';
            message.style.width = '250px';
            message.style.fontSize = '14px';
            message.style.textAlign = 'center';
            message.style.textDecoration = 'none';
            message.style.background = '#007bff';
            message.style.color = '#ffffff';
            message.style.padding = '10px 20px';
            message.style.borderRadius = '8px';
            message.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            message.style.zIndex = '9999';

            document.body.appendChild(message);

            return message;

        }

    }

}

export { ARButton };
