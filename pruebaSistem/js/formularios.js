//registro de un empleado, pero esto quiza ya no sirva
/*(function () {
  document.querySelectorAll("[data-guardar]").forEach(function (formulario) {
    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var datos = {};
      var valido = true;

      formulario.querySelectorAll("input, textarea, select").forEach(function (campo) {
        var valor = campo.value.trim();
        if (campo.required && !valor) {
          valido = false;
        }
        datos[campo.name] = valor;
      });

      var mensaje = formulario.querySelector(".mensaje-ok");
      var error = formulario.querySelector(".mensaje-error");
      if (!valido) {
        if (error) {
          error.hidden = false;
        }
        if (mensaje) {
          mensaje.hidden = true;
        }
        return;
      }

      if (error) {
        error.hidden = true;
      }
      sessionStorage.setItem(formulario.getAttribute("data-guardar"), JSON.stringify(datos));
      if (mensaje) {
        mensaje.hidden = false;
      }
    });
  });

  document.querySelectorAll("[data-postular]").forEach(function (boton) {
    var clave = "shyplay_postulacion_" + boton.getAttribute("data-postular");
    if (sessionStorage.getItem(clave) === "1") {
      boton.textContent = "Postulación registrada";
      boton.disabled = true;
    }

    boton.addEventListener("click", function () {
      sessionStorage.setItem(clave, "1");
      boton.textContent = "Postulación registrada";
      boton.disabled = true;
    });
  });
})();
