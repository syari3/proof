# 証明問題データ形式 v1（初版）

## 目的

この形式は、一般の図形を画像から認識するためのものではなく、**証明問題メーカーが問題を安全に生成・検査するための内部データ**である。出題条件、作図・交点の定義、証明したい目標を明示的に保持し、図の見た目から条件を推測しない。

- `geometry` は図形の構成と条件を表す。
- `goal` は求める証明を表す。
- `proofPlan` は、証明エンジンが実際に見つけて検査する前の「候補方針」を記録する場所。ここに書かれた方針だけで証明済みとは扱わない。
- 問題データの構造チェックと、数学的に正しいことの検証は別物である。

## 最上位フィールド

| フィールド | 必須 | 意味 |
|---|---:|---|
| `format` | ○ | 固定文字列 `proof-problem` |
| `version` | ○ | 形式の版。初版は数値 `1` |
| `id` | ○ | 問題を識別する一意なID |
| `source` | ○ | 出典・年度・転記の確かさ |
| `title` | ○ | 内部管理用の題名 |
| `prompt` | ○ | 生徒に提示する問題文 |
| `geometry` | ○ | 図形オブジェクト、点、構成、条件 |
| `goal` | ○ | 証明目標 |
| `proofPlan` | — | 既知の分析や未実装ルールなど。証明済みのログではない |
| `validation` | — | 検査状況と未解決事項 |

## geometry

### objects

図形の名前と型を登録する。初版では `line`、`circle`、および「指定点を通り既知の直線に平行な直線」を表す `parallel-through-point` を使う。線分や三角形は、必要に応じて点の組や目標の中で表す。

```json
{ "id": "line-AC", "type": "line", "through": ["A", "C"] }
{ "id": "line-EF", "type": "parallel-through-point", "through": ["E"], "parallelTo": "line-BC" }
```

同じ直線上の線分を別々の直線として誤登録しないよう、交点・平行条件はオブジェクトIDを参照する。平行線として作られる直線は、交点Fを先に必要としない形で定義する。

### points

点は一度だけ宣言する。円周上などの位置は、図から推測せず `constraints` に明記する。

```json
{ "id": "A", "role": "given-point" }
```

### constructions

補助点や交点を「何と何から作られた点か」で表す。例：

```json
{ "point": "E", "type": "intersection", "of": ["line-AC", "line-BD"] }
```

`intersection` は、交点が問題文で定義されていることを表す。交点が一意に定まるか、定義が矛盾しないかの幾何検証は別途必要。

### constraints

条件は型付きオブジェクトで記録する。初版の例：

- `point-on-circle`: `{ "type": "point-on-circle", "point": "A", "circle": "circle-O" }`
- `point-on-arc`: `{ "type": "point-on-arc", "point": "P", "circle": "circle-O", "endpoints": ["D", "C"], "arcChoice": "not-containing-A" }`
- `equal-segments`: `{ "type": "equal-segments", "segments": [["C", "A"], ["C", "D"]] }`
- `parallel-lines`: `{ "type": "parallel-lines", "lines": ["line-EF", "line-BC"] }`
- `same-segment`: `{ "type": "same-segment", "chord": ["A", "B"], "vertices": ["C", "P"] }`。指定した2点が、弦ABに対する円の同じ側にあることを表す。これは単なる「同じ円周上」からは推測せず、図または弧の範囲を確認して記録する。

`arcChoice` は、両端点だけでは円周上のどちらの弧か区別できないための情報。原問題で弧の選択が確認できない場合は、推測して補わず未確認として記録する。

### dynamicConditions

動点問題の条件は通常の固定条件と分ける。例えば「Pが弧上を動き、BA=BGとなる位置を考える」なら、Pの移動範囲と、成立させる等式を別々に記録する。生成器は、動点の条件を満たす配置が存在するかを後段で検査する必要がある。

## goal

初版で使う目標型：

```json
{ "type": "triangle-similarity", "triangles": [["A", "F", "E"], ["B", "G", "P"]] }
```

三角形の頂点順は対応関係を表すため、勝手に並べ替えない。将来、角の等しさ・線分の等しさ・合同などの型を追加する。

## proofPlan / validation

`proofPlan.recordedProperties` は過去問分析表に記録されていた性質のメモで、具体的な証明ステップではない。`validation.status` が `not-yet-proved` なら、画面に「証明済み」として表示したり、正解の証明として採用したりしてはいけない。

構造が正しいJSONであること、参照IDが存在すること、図形条件に矛盾がないこと、証明エンジンが目標を導けることは、それぞれ別の検査段階とする。

## 作成時のルール

1. 問題文に明記された条件と、そこから証明で導く条件を分ける。
2. 図の見た目から平行・等長・円周上などを追加しない。
3. 補助点は、交点や問題文の定義と結び付ける。
4. 出典の転記が不確かな部分は、確定情報に見せず `validation.openQuestions` に残す。
5. 証明の候補と、検査済みの証明ログを混同しない。
