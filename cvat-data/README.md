# cvat-data module

```bash
npm run build  # build with minification
npm run build -- --mode=development     # build without minification
npm run server # run debug server
```

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, backward compatible bug fixes, refactoring) do: `npm version patch`
- After changing API (backward compatible new features) do: `npm version minor`
- After changing API (changes that break backward compatibility) do: `npm version major`
