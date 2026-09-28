# LaundryOS Frontend

## Getting Started

Point the frontend at the Django API:

```bash
cd laundryfrontend
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Set `NEXT_PUBLIC_API_BASE_URL` to the backend API root, for example `http://localhost:8000/api/v1`.

## Checks

```bash
npm run lint
npm run build
```

The application uses the Django backend as the source of truth. Authentication, branch scope, catalog records, customers, orders, and receipts are all loaded through the API client in `lib/api.js`.

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
