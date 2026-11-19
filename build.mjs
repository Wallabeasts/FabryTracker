// Builds index.html: one self-contained file with the app, its styles and React inlined.
// Run: npm install, then npm run build.

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const work = mkdtempSync(join(tmpdir(), "fabry-build-"));

// BETA=1 node build.mjs builds a test copy into dist-beta/, for a "beta" folder in the same repository.
// The beta keeps its own saved data and offline copy (keys start with "rdt-beta-"), shows a Beta label,
// and asks search engines not to list it.
const BETA = process.env.BETA === "1";
const OUT = BETA ? "dist-beta" : ".";
if (BETA) mkdirSync(OUT, { recursive: true });
const PREFIX = BETA ? "rdt-beta-" : "fabry-tracker-";
const betaKeys = {
  name: "beta-storage-keys",
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/].*\.(jsx|js)$/ }, (args) => ({
      contents: readFileSync(args.path, "utf8").replace(/(["`])fabry-tracker-/g, "$1rdt-beta-"),
      loader: args.path.endsWith(".jsx") ? "jsx" : "js",
    }));
  },
};

// 1. JavaScript: the app plus React, minified into one script.
const js = await build({
  entryPoints: [existsSync("src/main.jsx") ? "src/main.jsx" : "main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020", "safari15", "chrome90", "firefox90"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', __BETA__: BETA ? "true" : "false" },
  plugins: BETA ? [betaKeys] : [],
  legalComments: "none",
  write: false,
});
const script = js.outputFiles[0].text
  .replace(/<\/script/gi, "<\\/script")
  .replace(/<!--/g, "<\\!--");

// 2. CSS: only the Tailwind classes the app uses.
const cssIn = join(work, "in.css");
const cssOut = join(work, "out.css");
writeFileSync(cssIn, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
execFileSync(process.execPath, [
  require.resolve("tailwindcss/lib/cli.js"),
  "-c", "tailwind.config.cjs", "-i", cssIn, "-o", cssOut, "--minify",
], { stdio: "inherit" });
const css = readFileSync(cssOut, "utf8");
rmSync(work, { recursive: true, force: true });

// 3. A content security policy that only lets the page talk to the services it uses,
// including each health system listed in HEALTH_SYSTEMS in App.jsx.
const appSource = readFileSync(existsSync("src/App.jsx") ? "src/App.jsx" : "App.jsx", "utf8");
// The full list of Epic health systems (src/epicBrands.json, made by scripts/epic-brands.mjs) is added too.
const brandOrigins = existsSync("src/epicBrands.json")
  ? JSON.parse(readFileSync("src/epicBrands.json", "utf8")).e.map((a) => new URL(a).origin) : [];
const healthOrigins = [...new Set([...[...appSource.matchAll(/fhirBase:\s*"(https:\/\/[^/"]+)/g)].map((m) => m[1]), ...brandOrigins])];
const scriptHash = createHash("sha256").update(script).digest("base64");
const csp = [
  "default-src 'none'",
  `script-src 'sha256-${scriptHash}'`,
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data: 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  `connect-src 'self' https://eutils.ncbi.nlm.nih.gov https://clinicaltrials.gov https://docs.google.com ${healthOrigins.join(" ")}`,
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAYO0lEQVR42rVad1hUR7v/zTlngWVZdmlLr4KgFAtFVEAF/BALAgqoAY2oibmWmEQTG/aWqzGGxETzRaNRI5YYW6yoidgw2AIaGwgYkA7CAsvunp37xwGCihGMdx4e9tlzZmfe3ztvn5fgTQ/CMCCEEPLcc9r8QalOB0rf2HZvZhmGESimPN/B+WAYCEj+HZh/B4AQwjCUUuh0rcuJrayMHB2ldnbGVtYSuRyGhlqKBqWyobqqrrhYmZ/flP9IW1f39yIcB55/bRjktUkHw4LXCt/E9vam/YPMg0MUfv6m7h5SmcQIMAb0AR1QD1QDdUA1UA1UNqgrrl9TpZ9q+uUozcpqJpxl8VqiRV6LdAY8D4A1lsmHD1fExcuDB8jMZIYAB6hrG5vu/9l0/746L7ehuFhdVaVSNWpAdAYGvIkJsXfgu3VX+/RUdXHgAc2DPPrtJmzdQquqmmF0UAhfc7BsswxbWRumLLa+l9uNUj9KAyj1/eOO+/oNViOixPb2HeEK4+DAjhlL9v3E1KuYugayag2MpM1bEPL/cAItjCcSCTNzFjN1mtjB2gBgKmrp4Z/rd++qzzhPm5pap8tNTfv162djbV1VU63VaCsrK4qflBQWFvJqNRiG6HStskLkcoyKw8xZxFhGUxbSnduatbxFr96MkWnebMgw5vpthlKWUr3Sar216xlX17+PRyQC4OrmNm3atCuXLu3Zsyc+Pr5bNw8bG5v4uLiTJ44fPXxofFISy7IACMtC+GtFMiqeZOUwOw9Aatz2tN+Q2OjpM//7BamjREOJkpKtO+HWtXljliUsK5AVGTl06ZIle3bvHjZ0qPDWzs5uyZIllRWVtU9rMn49t2De3OnTp0ulUtLqKwhpIzaEzFtKTv4O795vCAPLASD2TuTYRaKkpJ6SWw8xNOpvC8gwAFiGATB+/PgNn332ycdz7OzsACQmJu7du7exsZFS+ujRo2XLljo5OQHw8fFZtWoVwzAsy5L2FAy9Asi2XzBgyL/GIFDv40euPyYVlFRRsm0fzCya122RK4ZhCCGe3T1/2r8/bNBAAD179EhPT6eUUkoPHjw4ZkyClaWloHB+vr79+wb+sH376NGjhd8+vynHAYBESlJSERQBAAz7L6jvM4DcqWYeU1JM8eGitq/aKAgDYNfOnVOmTAEwJiEh++ZNrVq9a9cuRwcHABKJxLVLl5jo6B3bt2ffuJ5+7OinK1e8M2WKqakpaS/oaKWYJM5At95CfPI6ck969yXZT5lcLXmkwZhJLTbumbU4lgWQEJ9AKR04cGDU8GF3c7KvXb06KjYWQExMzKlTpwoLC8tKS2uqqkqfPDl14sR/wsOTkyemnz4dFRXV/iEIiiEACxkBc+vmJ52zOS7uJLOE3NMw9zWIGgcAnKidSIIQqVR6+dLld6ZMSX57wrdfb/xw1ixbGxsLC/Nvvv5aqVRWVFQUFBQU5BecO3MmKTHR2NgYwKRJk/Lz8/Pz883MzIRF2scg/Hf1gkjvZRaftA9dIiV7MtClGxiWzp+CfVvAiaDVvHBOLM/zE8ZPoFRnYWERNWJEfEICCPH09JTJZHV1dTdv3qytfUop5HK5mZmZuZmZVCq1tLAwVyhSU1PnzJmjamr67LPPhHXax0ApWA5iIyhr2gXAtcN+nsfiL+HqCYahXyx5GfUE4HleIpHo6YkUlpYrVqzIy8tTWFoaGRn98Ud2RUV528nl5eXl5eUAXF1dA/z96xsb3Lp2XblqVVJioomJSXV1NSGEvhgICU94LeqfNoPpkMmPScI9DbmrxsafmlW2vSMWZNfNze3kiROU0rS0tOjo6JiY6Na3gnVqHQzDiEQiAMuWLaOU1tfXf/PNN36+vu7u7i/VhE67W0JgaYuMApJTjzMPYWLeHEG0D5YF8MUXXzQ0NIwbO9ZSofD19d26datMJmNa0oMXAbu6uu7YseO7774rLy+nlO7ds8fb20tQp38PgAWApRvJnypkKzFw2D/4EWE/qVR66+bNIRER1lZWSUlJubm5lNJ58+YB4DjuRcAsyy5KWeTn62coNnTv2nXf3r2U0rlz574JAAL1nr1JVjm504i121+09y+ys4dPj/957z1HB4fgoOC7d+9RShuUyrLSEi8vr+ekoiXQiBwZNdLJ0alv374WFhYAfty1q6joL4lE0iEMhEAseZkSUwCYOAuGElpVjg2LQQjoK+JBjUZdXFys0WgGDAhxd+/6tLo6Kytr/eefu7u75+fnNzQ0CKrJMAzP805OTgNCQrQ8n7IoxczUtKS09ODBg3Nmzznw8wEXF5fs7Oz29fg5i2RmjfqnqC5/VqcFVrl741IRbisxa9krgxCBu926dYuKGhEcFFRcVFRTVfVlaqpcJgPwzpQpK1esEASJECHSYw8dOqRUKumz42pm5vx58zqhxxJjDIx5wa8JtM5bixwl0u9BYfMPuttWB0zk8vj4+F/Pnq2pqtz+/VZ9PT1CyMgRIy6cPZN77+7QyEgA+vr6ABYsWEApbVI1ZWfnfPP11ykpKZ98/PHq1atyHz7MysoSFObVIiSQFDsJTu5t4gvhZ8ZyHL2BO/WYv66DMaAg1qtXra6pqvrt7NkuLi4iTjRz+rTbN29cz7z0w3f/TXzrLWcXFwCxMbGU59NPnx6flGRiYmIslTo5OnXv1t3Jycm9a9ePPvqocyFC7yBM+qRNyCRo6pBY3KjE5SJ49m5O2DsGoF+/fg1K5ehRowBEDR9emJd3Nyf76qWLXp7dLS0tV61cEdinz7mzZ9+eMMFELmdZ1rhlODg4ODu7BAT08fPz65wfMDDEup2QmQjc55pVoV849A2QdRF3bgCA7tWZNc/zhJDLly//mLYnOydHTySKioqSSI2e1tZ+OOeTnNt3EuLiXJ0co6OjJ05M/uuvv0QiEcdxVEednZ36BwX16NHDyMioqrJq0eJFr1Df5w5B1QBNA0IicCQNDMNBx8NADA8faHlknG6OPVrqJa8sC+l0us2bN9na2pWWlHh5eZmamS9ctPjCxQv29vYB/r4NTZotW7cWFRcpFIqevXoGBgb6+/p26eJiamKqb6BvZCybO3duTU0Nx3FabYd2bBb4h7cRFokjaS2GyN0b5wuQUYBuPdtmwB3EIBKJEhISvL28CgsKysrKunbtamZq6uXZPe3HXT169AAwbuzY27dvC2aH12qrKysf5+fn5+WdO3dWX1+//ZTgn4OdkHCcugYDcYsfcPaAkQx3byLv7t8hVIeHRqO5cuVKcHAQz/OFhYU11dV1dXUhA0J279mrVCp37do1bty4+/fvL0pJefDwoUatZhimtLTU0dEhL+9RU1MTwzC6jhcgBNqKC2FuBrduyL4OAJg6DzkqLNnYWfY3M4VhAISGhmo1mj1paQD69g08evTovr171Wo1pXTdunUKhUJPJGrls5WlZUxMDMexnY7hhLMyV+BWARKSWk7Ayg6EIvdui3HtXEGG1+lYlj179uzp06cfPHxoaak4fOiwuYUFgKKiok8/XbN9+w8A+vbtGzFkiIlc3qVLF41GMzE5medft/LT2ABtE7q6twCQmaKpCYUP25bBOzWoTkcImTxlSnR0dOoXqcdPnEg/ffpJScmjvLyqqiqNRjNmzNj1n62Tm5gI88PDw8vKyl6ax3TAAoJXw9YOAAdCYCBBfT3KnryGArSt/dfV1ZmYmKxavfrWrVscx4k4ESfiVI2qsePGbd26BcCDBw/q6up+PXfuzJkznbA87UktOAZmpi2WddNRnHoAO6fX0wEh2iGETJo0yd3dXV9f38nRUaFQ2NjYBPj7f7/1e0rpxYsX40aP7ubhERsb62hvHzpo0GsmMYIOmJriz4c4lt7iyHgdmprQ2PB6J8CyrFarXbBgQWBgn7i4OGdnZ5ZllUqliONcunQpKytLTk4+cfy4vr5+RETE2bNn1Wr1go/nmJmb79u3r9PnIAShMhmkEnCtAdvn+/DzzVbn3CnqhbLKwoULBTPf2NBYUVGhalS1xptFRUXXr1/Pzc2tV9YPHTqUZdlNX6Xm3fvz/G+/eXp6toYknfMDgYF4WoeTp8EKgVBtDcCi8zmRwL933313/Pjxa1avPp+Rkf/okUajkUgkLl26hIaGRkT8x82tq42NDYBFKSnHjh1LiIsbETXSUGI0cco7nt27i8XirKysTmizQKSLM8T60DSB5zkAKC8FpweRfku1gXZccoYPHy6Xy/sEBFTX1Ojr6RlKJHoivbo6ZeHjxydPnlyzZo2rq6ubm5tX9+7r1q0zMNCPi4+3sXf44YcffjufceTw4T6Bffz9AwoKCliW6bhVJV7dqYiDsq7FjD7OhUgfhkYdp1/gmY+3t4WFxXfffaewtLSxtVWpVDXVNfX1SpbjKKUsy1aUlxcVFdnb2V7MOK/Rary9vAcPHtykUi1etGj5sqX/iYh4++23g4OC1Gr1kydPOuSSeR4A7dEDoKiqaAGQfxcATBUoeNCRKw8hRbS3t583b75ITzR37lyhXN7Y2FhQUPDnn3evXr2Sm5unUqksLS2D+vd/8rhQyXE8rwsNDTWWydb+79rQ0NCFKYtGjRp14MABGxvr5cuXz5s3r7y8/BUYhFsPW2t094BOg8ePW17ITLE/G8MTO5LKCLUesVick3ObvmRo1OrqqqqK8nJK6fKlSxfPnzdsaKSxsfHt2zn1SuXWLVsopTNmTOc41tnJ6cvUVErp7h9/FIvF7dZjnilcE4LRsaivQX0NRka1UYu1+/DBulfWslsT3CNHjvzxxx8LFiyIjIwMDgqeMGHCV199deXKlaamplYMlNJNmzYBmD93rrOT08QJE3Q8X69UUkpnf/SRiONGjx5148YNSml1VVVMdHRcXBzDMv+EQWDut5ugrEXhIzg7tXka+w42nnylIRJM3ntTp37wwQdisRhASEjI+++/P3DgALGB2MLcPHTQoKVLlmzevHn+/PkrV66Uy+UMw8hlsqTExHNnziifPq2pqUl8KxHAJx9/wvO8gHbmzJkARsXGrlq58qWGVaDNzAx/ZKOyEunpzZW45tRYYYsdV2HX5R+cseA4hw4dGh8fLzYQJycnZ2VlZWZmJicn29jYGBkZGRoatk4OCgry8vRsrXB5e3uXlZTkPrgfHhYOYFTsKEqpTqdTqVSzZ8+2sbFWWJh/u2mTVqsNCwtrH4NQKXsrESUVKKvEosXNhhxUB4ZBWREeZqP/EOzZ+LJKqE6nc3NzMzMzu3P7zvETJwYMCFm/fv38efOMjIwCAgIUlpY6nU6pVDIM4+fnl5OTc+HCBcHUchyXnZ29bPlyI6k0/Uy6k6Pj4sWLKNWpGlUzZ848ceIEwzCjRsclT558IeO8zNjY2cnpUX4+IQRtE02eByGIjUOjGoTi+LE2cYMg9z2DsO6nlzljhmE4jhs3dty0adPq6upUKlVMdDSAOXPm5OXmPafE586dE1SlVZpZlgGQ+NZbFubmCfHxqsZGdVPT0iVL5DKZh4e7v5/v48ePKaVCZWn69OlCQekFB9wP9/7Cvcc4dPKFkrMgNou2oEf/F1VZONCwsLBffjlKKX1c+Lh3795isXhP2h6B4qrKquPHj3+6Zs2MGTNSU1MF19s2VhOocXJ0jImJWbFsWVNj48ULGdbWVna2tlIjyYb16ymlT2tqBoeHG0kkmZmZI0eOfEaQhKW+/B63CnCvBOMmvmAwhRnd/fHh588BEG5QxGJxZmYmpfRq5tVuHh4sw6Tt3k0pLS0tXb5seYC/v5mpKYBevXoFBwe3pmkvJm6+vn43rl+vKi9fnJKip6dnZmrq5up68/r1+rq6/27eLDYwGBASomps/O3XX1mWZRiGtBLqG4jLuci4i2OXYSwDyAuSImyZOBue/m1VWdDCyZMnU0q3bdsmFA/3798vfPX28rJUKGysra0sraZOnbpg/nyRSPSy+Ex4vuHzz2trasLDwgwMDDiWfX/GjLInxdeuZnr7+BCGnTwp+Vpm5jcbN/r6+YNlGeEml2HwZRrO3MXlAiS++xJ/RQgIA6kcb30ITiRYJ6FkYGhoePjQ4cmTkgHY29unnz794P79hPh4sVgsMzY2MTHp3avXkSNHysvLW4WHMAzDcYxwG8swYFnCcgzHEUJMTEwuXbzYzcNdbGAgl8kO//xzzq2bfj17CnGMoaHY2MpKZmribKn4+wosYhROPcDRW9hxBoaSv68AX+y2AgBnT/Qe1Nx8xTCCsQ8OCgIwbNiwbzdvmv3RR8JdnVwmc3Rw+GDWrLy8PErpmDFjAIj09J5bnXmmjM8CiI2NDQkOBuDv7/f75YuDg/pLrawHL1069tr1+IK/htz4I+Dcbw470ozmLCQOzkRuhh8ykJaJY/cQPPR5CW8HA9XBtQdqylDxRKiZRUZG1tbWenh4FBUXZ2Rk1CuVAFiOBcXePXtiokcSljuTnj44IoJhWV6jAWDv4+MTNcKyV+8muUmljpRV1Zb+nlmbfqLx5nUekEilI4YP37t//4jB4RGRkekNqn4fz6kArmzedPvGo9r791W3MjB6GsM2UGNTKneGnQv0xcg8jc8+eq4PhG0nvyUEVSWQyIhWTXmtlbV10vjxJcXFhw8cuHvvnkatbuYlJ+IptbOxVSgU165fX7lmTWF+PqPT2YeFD9mxI2T2J00iadaRg1nnM+/VsCWlfzUMS6CT3qc+AbSyoin3rlxqBJXKJSDQ5YMPXcPDbt/I3vHB8jufLq63ttXa25JLv+rHxek2LKcqFsPGo0GJmkqs+wBqVWdubfQMQIhUX9/FxobhOEcfH5/IIa7h4daenhIjiQDd2clp8JAhoeGDDQBOYdk1bc9oHR2waZO0d3+EJQGAjTNmLAcAM2us3ImzD8nlcvLeUj2J/O2lSxfX1m2gdNS6dYzCBms2MSxnmZjU5dO1YFjJ8nXshPeRegr/zcD3mejm326UwPxD3KNTq0Cp/eDBoZu/nV9WEXr+kunOvdyh46KcHIPCMm7/z+zI6IK/HvdydhapG1R9Q7hrt6uDB5+aseS3qVPr1PUYFcGwHHGwQVAPsBysrVH+iEkMw7Ur1LVv79RtJgsWNEmNflmy5KfZszlG18vbQcdrVdU1tYZS6Pj6mw/54VMglUAqw7bV+PN3MOyLTUTtAyAcB56XeftEZ14dtjutprx0y4cp349O/tXZ/m7C5MIJ71UePqAeGU0O/qz79cpVS+scuRs27G+6cq080K/WSMqwrIGRWGEu1vFaqU7rqQ/wWqk+4xrkrSsuwPQR3UyUDskjy1n2XOrW08tWM4CuvuFOjYqw7NOSivL8MuLcFVFjwFGYmWPHWvx2ECzbkZp5C/WAeFySR11Dz+27DYdNAgDfEEyYxQKYvhBungQg7yxkt2wnlEJLjX5/qPf+GgB61tZdTpwGYBXYd/D+AwDM+vTxPXQEgKGfv/WO3QxgnLLIQcf7U+rx+feYtZlsPUNikmAsw4drATAmVmTdXhy+gSvlOH4XEXGdbLoR2jyS3haVVulHRIJwZMVGhuMkcQlm6zaAEMfUr4wjh8JALF77DQBm5iLmSQ1DKZd9mwwKZQ3ERjsPEJYV9QnUS/sJAOPfB0eOg2Xh2h0LNoiWrWAolah50wkTwYnJ9OW4XIxCigsPsP8C+fZHkpFNSigeNZCth9C9xytTFO7FPgPSN4jMmKPpG4i8+yI7O7mHbTmlBhq1EctUEaLU6DQsB1VjU3UjWbtNx1gwUaORnKCdOpmcPaPb8LXy1iPwvEbVBC0hLEt0YCobwfNU1YixMdTTQfbwkfadKVXnzhCG0K9ScO4nEjcOYWFMfw8YB9DiYhz/Afv20mO/NFPfQclpdm8mJkzqt7C2JZbOjF8obByw7GsCIDAYyz8DgMlz0D+cGTqMFDzFuT/Rd1Dzr0eMJLduM5QyTyqZsWOJqycmpwCAsQLvLsfoeKaiRk6p7XdbjK2sWgSVtDbvEIDI5cRY9oyd6VzpTpgdNACOTs2y5OJJJs8n6w+QwVFM/GRuydcm/fo7b97l9aDQvKCILFwKIYNhWnr3DMRk8hTmVjZDqX5FrfjQOavkZPtlaxzyqlyfNrqk7VUE9mWf6y4T9n1OxJ9tBuxM2yXDwMAADQ1tvR3x8EHYUJG1wpbV2culap226MKFkiNHNcq6Z/ojW3pWCYDevU0HDbJ072pmaMRVV1dcuVSafqaytJQX5r+sX7o1APm3reGtC/1zivxih6rQf/jy+eQNtKR0pOHpOQYwDAgD0LZX0fQf2rUJQZvKAmm5QKBvspH17/F/oGwlLvb4X28AAAAASUVORK5CYII=";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<title>My Rare Disease Tracker${BETA ? " (Beta)" : ""}</title>${BETA ? '\n<meta name="robots" content="noindex, nofollow">' : ""}
<meta name="description" content="My Rare Disease Tracker helps people living with rare conditions keep their lab results, treatments and symptoms in one place.">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="light dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${BETA ? "My RDT Beta" : "My RD Tracker"}">
<link rel="icon" href="${icon}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Montserrat:wght@500;600&family=Comic+Neue:wght@400;700&display=swap">
<style>${css}
html,body{background:var(--bg,#EEF2F4);margin:0}
body{font-family:'Atkinson Hyperlegible',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink,#1B2B3A)}
</style>
</head>
<body>
<div id="root"></div>
<noscript><p style="padding:24px">My Rare Disease Tracker needs JavaScript. Please turn it on in your browser settings.</p></noscript>
<script>${script}</script>
</body>
</html>
`;

writeFileSync(join(OUT, "index.html"), html);

// 4. Service worker for offline use. Its cache name changes with every build, so phones pick up updates.
const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
writeFileSync(join(OUT, "sw.js"), `// My Rare Disease Tracker offline support. Generated by build.mjs.
const CACHE = "${PREFIX}${version}";
// This worker looks after only the app page in its own folder. Other pages (terms.html, a beta/ folder) are left alone.
const ROOT = new URL("./", self.location).pathname;
const isAppPage = (url) => { const p = new URL(url).pathname; return p === ROOT || p === ROOT + "index.html"; };
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("${PREFIX}") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Only the app's own files are cached. Trial and article searches always go to the network.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    if (!isAppPage(req.url)) return;
    // Newest page when online, saved copy when offline.
    event.respondWith(fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Translations: newest when online, saved copy when offline.
  const path = new URL(req.url).pathname;
  if (path.startsWith(ROOT + "lang/") || (path.startsWith(ROOT) && path.endsWith(".json") && !path.slice(ROOT.length).includes("/"))) {
    event.respondWith(fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`);
// 5. terms.html: the terms of use as a plain web page, from the same text the app shows.
// Its address goes in the "Terms and Conditions Secure URL" field on fhir.epic.com.
{
  const grab = (start, end) => appSource.slice(appSource.indexOf(start), appSource.indexOf(end, appSource.indexOf(start)));
  const { APP_INFO, TERMS } = new Function(
    `${grab("const APP_INFO = {", "\nconst KEY")}\n${grab("const TERMS = {", "\nfunction TermsText")}\nreturn { APP_INFO, TERMS };`
  )();
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<meta name="referrer" content="no-referrer">
<title>Terms of use: ${esc(APP_INFO.name)}</title>
<link rel="icon" href="${icon}">
<style>
:root{--bg:#EEF2F4;--surface:#FFFFFF;--ink:#1B2B3A;--muted:#5B6B7A;--line:#D5DDE3;--accent:#1D5FA8;color-scheme:light dark}
@media (prefers-color-scheme: dark){:root{--bg:#0E171D;--surface:#16232C;--ink:#E4ECF1;--muted:#9DB0BD;--line:#2B3E4B;--accent:#7FB2EA}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 48px}
.app{color:var(--accent);font-weight:700;margin:0 0 8px}
h1{font-size:28px;line-height:1.2;margin:0 0 4px}
.meta{color:var(--muted);margin:0 0 24px}
.box{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 20px;margin-bottom:24px}
h2{font-size:18px;margin:24px 0 6px}
.box h2{margin-top:0}
ul{padding-left:20px;margin:0}
li{margin-bottom:8px}
p{margin:0 0 10px}
</style>
</head>
<body>
<main>
<p class="app">${esc(APP_INFO.name)}</p>
<h1>Terms of use</h1>
<p class="meta">Version ${esc(TERMS.version)}, effective ${esc(TERMS.effective)}</p>
<section class="box">
<h2>In short</h2>
<ul>
${TERMS.summary.map((t) => `<li>${esc(t)}</li>`).join("\n")}
</ul>
</section>
${TERMS.sections.map((sec) => `<h2>${esc(sec.h)}</h2>\n${sec.p.map((t) => `<p>${esc(t)}</p>`).join("\n")}`).join("\n")}
</main>
</body>
</html>
`;
  writeFileSync(join(OUT, "terms.html"), page);
}

if (BETA) {
  const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));
  writeFileSync(join(OUT, "manifest.webmanifest"), JSON.stringify({ ...manifest, name: "My Rare Disease Tracker Beta", short_name: "My RDT Beta" }, null, 2) + "\n");
  for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) copyFileSync(f, join(OUT, f));
  // Translations (lang/keys.json and one file per language) go with the beta too.
  if (existsSync("lang")) {
    mkdirSync(join(OUT, "lang"), { recursive: true });
    for (const f of readdirSync("lang").filter((x) => x.endsWith(".json"))) copyFileSync(join("lang", f), join(OUT, "lang", f));
  }
}

// security.txt: tells anyone who finds a security problem where to report it privately (https://securitytxt.org).
if (!BETA) {
  const appSrc = readFileSync("src/App.jsx", "utf8");
  const email = (appSrc.match(/contactEmail: "([^"]+)"/) || [])[1];
  const expires = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
  mkdirSync(".well-known", { recursive: true });
  writeFileSync(join(".well-known", "security.txt"),
    `# My Rare Disease Tracker. Please report security problems privately to the address below.\n` +
    `# Don't include patient health information in your report.\nContact: mailto:${email}\nExpires: ${expires}\nPreferred-Languages: en\n`);
}
console.log(`${BETA ? "BETA " : ""}${OUT}/index.html written: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, sw.js cache ${version}`);
