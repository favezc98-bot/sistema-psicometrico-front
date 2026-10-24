window.iniciarCronometroGlobal = function(tiempoTotalSegundosporDefecto) {
    var elementoTiempo = document.getElementById("tiempo");
    if (!elementoTiempo) return;

    // Obtener el ID del candidato actual para aislar su tiempo en localStorage
    var sesionStr = sessionStorage.getItem("shyplay_sesion") || localStorage.getItem("shyplay_sesion");
    var idCandidato = "1";
    if (sesionStr) {
        try {
            var sesion = JSON.parse(sesionStr);
            idCandidato = sesion.idCandidato || sesion.idUsuario || "1";
        } catch(e) {}
    }

    var CLAVE_TIEMPO = "shyplay_bateria_tiempo_" + idCandidato;

    // Recuperar tiempo restante guardado o usar el por defecto (ej. 1500 segundos = 25 min)
    var tiempoRestante = parseInt(localStorage.getItem(CLAVE_TIEMPO) || tiempoTotalSegundosporDefecto, 10);

    function actualizarReloj() {
        var minutos = Math.floor(tiempoRestante / 60);
        var segundos = tiempoRestante % 60;
        elementoTiempo.textContent = (minutos < 10 ? "0" : "") + minutos + ":" + (segundos < 10 ? "0" : "") + segundos;
    }

    actualizarReloj();

    var intervalo = setInterval(function() {
        if (tiempoRestante > 0) {
            tiempoRestante--;
            localStorage.setItem(CLAVE_TIEMPO, tiempoRestante);
            actualizarReloj();
        } else {
            clearInterval(intervalo);
            localStorage.removeItem(CLAVE_TIEMPO);
            alert("¡El tiempo de la evaluación ha terminado!");
            if (typeof window.finalizarBateria === "function") {
                window.finalizarBateria();
            } else {
                window.location.href = "login.html";
            }
        }
    }, 1000);
};