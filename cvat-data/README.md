# cvat-data module

```bash
yarn run build  # build with minification
yarn run build --mode=development     # build without minification
yarn run server # run debug server
```

## Versioning

If you make changes in this package, please do following:

- After not important changes (typos, backward compatible bug fixes, refactoring) do: `yarn version --patch`
- After changing API (backward compatible new features) do: `yarn version --minor`
- After changing API (changes that break backward compatibility) do: `yarn version --major`
