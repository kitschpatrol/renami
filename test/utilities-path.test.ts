import path from 'pathe'
import { expect, it } from 'vitest'
import { isAbsolute, resolveWithBasePath } from '../src/lib/utilities/path'

it('detects absolute paths', () => {
	const testPathsRaw = [
		String.raw`C:/Bla bla bla`,
		String.raw`/Bla bla bla`,
		String.raw`../Bla bla bla`,
		String.raw`./Bla bla bla`,
		String.raw`Bla bla bla`,
		String.raw`C:\something\something\/**/*.md`,
		String.raw`C:\something\something\/**/*.md`,
		String.raw`C:\something\something\/**/*.md`,
		String.raw`C:/something/something//**/*.md`,
		String.raw`C:\\something\\something\\/**/*.md`,
		String.raw`../yes`,
		String.raw`C:\Bla bla bla`,
		String.raw`C:\\Bla bla bla`,
		String.raw`C:\\Bla bla bla\\some file.txt`,
		String.raw`d:\Bla bla bla`,
		String.raw`z:\Bla bla bla`,
		String.raw`C:\Bla bla bla`,
		String.raw`C:\\Bla bla bla`,
		String.raw`C:\\Bla bla bla\\some file.txt`,
		String.raw`d:\Bla bla bla`,
		String.raw`z:\Bla bla bla`,
		String.raw`\\?\Volume{abc123-abc123-abc123}\\`,
		String.raw`\\Server\Share\folder`,
		String.raw`C:/Bla bla bla#some#stuff`,
		String.raw`/Bla bla bla#stuff`,
		String.raw`Bla bla bla#stuff`,
		String.raw`./Bla bla bla#stuff`,
		String.raw`../Bla bla bla^block`,
		String.raw`./Bla bla bla?query=yes`,
		String.raw`/path/Bla bla bla#stuff`,
		String.raw`/path/../Bla bla bla#stuff`,
		String.raw`./more/Bla bla bla.config.yes#stuff`,
		String.raw`../Bla bla bla.txt^block`,
		String.raw`./Bla bla bla?query=yes`,
	]

	const results = testPathsRaw.map((testPath) => {
		const normalized = path.normalize(testPath)
		return `${normalized} --> ${isAbsolute(normalized) ? 'absolute' : 'relative'}`
	})

	expect(results).toMatchInlineSnapshot(`
		[
		  "C:/Bla bla bla --> absolute",
		  "/Bla bla bla --> absolute",
		  "../Bla bla bla --> relative",
		  "Bla bla bla --> relative",
		  "Bla bla bla --> relative",
		  "C:/something/something/**/*.md --> absolute",
		  "C:/something/something/**/*.md --> absolute",
		  "C:/something/something/**/*.md --> absolute",
		  "C:/something/something/**/*.md --> absolute",
		  "C:/something/something/**/*.md --> absolute",
		  "../yes --> relative",
		  "C:/Bla bla bla --> absolute",
		  "C:/Bla bla bla --> absolute",
		  "C:/Bla bla bla/some file.txt --> absolute",
		  "D:/Bla bla bla --> absolute",
		  "Z:/Bla bla bla --> absolute",
		  "C:/Bla bla bla --> absolute",
		  "C:/Bla bla bla --> absolute",
		  "C:/Bla bla bla/some file.txt --> absolute",
		  "D:/Bla bla bla --> absolute",
		  "Z:/Bla bla bla --> absolute",
		  "//?/Volume{abc123-abc123-abc123}/ --> absolute",
		  "//Server/Share/folder --> absolute",
		  "C:/Bla bla bla#some#stuff --> absolute",
		  "/Bla bla bla#stuff --> absolute",
		  "Bla bla bla#stuff --> relative",
		  "Bla bla bla#stuff --> relative",
		  "../Bla bla bla^block --> relative",
		  "Bla bla bla?query=yes --> relative",
		  "/path/Bla bla bla#stuff --> absolute",
		  "/Bla bla bla#stuff --> absolute",
		  "more/Bla bla bla.config.yes#stuff --> relative",
		  "../Bla bla bla.txt^block --> relative",
		  "Bla bla bla?query=yes --> relative",
		]
	`)
})

it('resolves with base path', () => {
	expect(
		resolveWithBasePath('./foo/bar/baz.md', { basePath: '/yes/foo/', cwd: '/yes/foo/oh/really/' }),
	).toMatchInlineSnapshot(`"/yes/foo/oh/really/foo/bar/baz.md"`)

	expect(
		resolveWithBasePath('/yes/foo/oh/really/foo/bar/baz.md', {
			basePath: '/yes/foo/',
			cwd: '/yes/foo/oh/really/',
		}),
	).toMatchInlineSnapshot(`"/yes/foo/oh/really/foo/bar/baz.md"`)

	expect(
		resolveWithBasePath('./foo/bar/baz.md', {
			basePath: 'C:/yes/foo/',
			cwd: 'C:/yes/foo/oh/really/',
		}),
	).toMatchInlineSnapshot(`"C:/yes/foo/oh/really/foo/bar/baz.md"`)

	expect(
		resolveWithBasePath('C:/yes/foo/oh/really/foo/bar/buz.md', {
			basePath: 'C:/yes/foo/',
			cwd: 'C:/yes/foo/oh/really/',
		}),
	).toMatchInlineSnapshot(`"C:/yes/foo/oh/really/foo/bar/buz.md"`)
})
