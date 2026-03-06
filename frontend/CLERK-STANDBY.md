# Clerk en stand-by

El CRM está configurado para **acceso sin login** (Clerk en stand-by). Cualquiera con la URL puede entrar.

## Cómo reactivar Clerk (volver a pedir login)

1. Abre `src/App.jsx`.
2. Descomenta el import de Clerk:
   ```js
   import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react'
   ```
3. Restaura las rutas de sign-in y sign-up (sustituir los `<Navigate to="/" />` por los bloques con `<SignedOut>` y `<SignIn />` / `<SignUp />`).
4. En la ruta `path="/*"`, envuelve `<Layout />` en `<SignedIn><Layout /></SignedIn>`.
5. Añade de nuevo las dos rutas `path="*"`: una con `<SignedIn><Navigate to="/" /></SignedIn>` y otra con `<SignedOut><Navigate to="/sign-in" /></SignedOut>`.

Los comentarios `// STAND-BY CLERK` en `App.jsx` indican qué se cambió. Si pides "Reactiva Clerk" en el chat, se pueden revertir estos cambios por ti.
