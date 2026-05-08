# Travel Manager — Electron Application

Aplicación de escritorio desarrollada con **Electron** para la gestión de viajes corporativos de operarios/comerciales en un entorno empresarial real.

Este proyecto fue concebido como una herramienta interna para centralizar, organizar y dar trazabilidad a los desplazamientos de personal, sustituyendo procesos manuales basados en hojas de cálculo y comunicación por email.

---

## 🧭 Contexto del proyecto

En entornos industriales y de servicios, la gestión de viajes suele implicar:
- múltiples personas viajando simultáneamente
- información dispersa
- dificultad para mantener histórico y control
- errores administrativos frecuentes

Esta aplicación se diseñó para resolver esos problemas mediante:
- una interfaz clara
- flujos definidos
- persistencia local fiable
- visualización de información relevante

El proyecto se encuentra **en uso en un entorno real**, lo que ha condicionado muchas decisiones técnicas y de diseño.

---

## ✅ Funcionalidades principales

- Creación, edición y eliminación de viajes
- Gestión de destinos, clientes y proyectos
- Visualización de desplazamientos mediante mapas
- Integración de calendarios para planificación
- Importación de datos desde archivos Excel
- Persistencia local con sistema de backups automáticos
- Gestión de concurrencia mediante locks de archivo

---

## 🧱 Arquitectura

La aplicación se estructura en varias capas bien diferenciadas:

### Electron (Desktop)
- Control de ventanas
- Ciclo de vida de la aplicación
- Integración con el sistema operativo

### Backend local
- Node.js + Express
- API REST interna
- Persistencia en archivos JSON
- Sistema de backups y recuperación

### Frontend
- HTML / CSS / JavaScript
- Interfaz orientada a usuarios no técnicos
- Flujos claros y guiados

Esta separación permite:
- reutilizar la lógica de negocio
- facilitar mantenimiento
- adaptar el proyecto a otros entornos

---

## 💡 Decisiones técnicas destacadas

- **Electron** fue elegido para facilitar la distribución en entornos corporativos sin depender de navegador ni infraestructura web.
- **Persistencia en JSON** en lugar de base de datos para:
  - simplicidad
  - facilidad de backup
  - control directo de datos
- **Sistema de locks** para evitar corrupción de datos en accesos concurrentes.
- **Importación desde Excel** para integrarse con flujos ya existentes en la empresa.

Estas decisiones priorizan la **robustez y usabilidad** sobre la complejidad técnica innecesaria.

---

## 🌐 Demo web

Para facilitar la revisión del proyecto sin necesidad de instalar un ejecutable, se ha creado una **versión web de demostración** que reutiliza la lógica central del backend:

👉 **Demo web:**  
https://travel-manager-web.onrender.com

> Esta demo no sustituye a la aplicación de escritorio y omite algunas funcionalidades por motivos de seguridad.

---

## 💻 Ejecución en local (Electron)

```bash
npm install
npm start
Nota: la ejecución y distribución del ejecutable dependen del entorno y la configuración corporativa.

🛠️ Tecnologías utilizadas
Electron
Node.js
Express
JavaScript
HTML / CSS
XLSX
Persistencia en JSON
Mapas y calendarios interactivos
📌 Estado del proyecto
✅ En uso en entorno real
✅ Mantenido activamente
✅ Adaptado a demo web para portfolio
🔄 En evolución según necesidades del negocio
📬 Contacto
Para más información sobre este proyecto o su adaptación a otros entornos:

GitHub: https://github.com/Ibaiara
LinkedIn: https://www.linkedin.com/in/ibai-araña-b2832027a